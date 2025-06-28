import {
  openai,
  createAgent,
  createTool,
  createNetwork,
  type Tool,
} from "@inngest/agent-kit";
import { Sandbox } from "@e2b/code-interpreter";
import { z } from "zod";

import { inngest } from "./client";
import { getSandBox, lastAssistantTextMessageContent } from "./utils";
import { PROMPT } from "@/prompt";
import { prisma } from "@/lib/db";

interface AgentState {
  summary: string;
  files: { [path: string]: string };
}

export const codeAgentFunction = inngest.createFunction(
  { id: "code-agent" },
  { event: "code-agent/run" },
  async ({ event, step }) => {
    const sandboxId = await step.run("get-sandbox-id", async () => {
      const sandbox = await Sandbox.create("mragent-nextjs-test-2");
      return sandbox.sandboxId;
    });
    // Create a new agent with a system prompt (you can add optional tools, too)
    const codeAgent = createAgent<AgentState>({
      name: "code-agent",
      description: "An expert coding agent",
      system: PROMPT,
      model: openai({
        model: "gpt-4.1",
        //temperature might not exist for non chatgpt models
        defaultParameters: { temperature: 0.1 },
      }),
      tools: [
        createTool({
          name: "terminal",
          description: "Use the terminal to run commands",
          parameters: z.object({
            command: z.string(),
          }),
          handler: async ({ command }, { step }) => {
            //step can be undefined if the function is not run in a step
            return await step?.run("terminal", async () => {
              const buffers = { stdout: "", stderr: "" };
              try {
                const sandbox = await getSandBox(sandboxId);
                const result = await sandbox.commands.run(command, {
                  //gathers the standard output from the terminal
                  onStdout: (data: string) => {
                    buffers.stdout += data;
                  },
                  //gathers the standard error output from the terminal
                  onStderr: (data: string) => {
                    buffers.stderr += data;
                  },
                });
                console.log("result: ", result);
                return result.stdout;
              } catch (e) {
                console.error(
                  `Command failed: ${e} \nstout: ${buffers.stdout} \nstderr: ${buffers.stderr}`
                );

                //inngest will automatically retry the function if it fails with the context of the error
                return `Command failed: ${e} \nstout: ${buffers.stdout} \nstderr: ${buffers.stderr}`;
              }
            });
          },
        }),
        createTool({
          name: "createOrUpdateFiles",
          description: "Create or update files in the sandbox",
          parameters: z.object({
            files: z.array(
              z.object({
                path: z.string(),
                content: z.string(),
              })
            ),
          }),
          handler: async (
            { files },
            { step, network }: Tool.Options<AgentState>
          ) => {
            // it will recognise the input it accepts and return an object
            const newFiles = await step?.run(
              "createOrUpdateFiles",
              async () => {
                try {
                  //keep track of files in internal network state
                  const updatedFiles = network.state.data.files || {};
                  const sandbox = await getSandBox(sandboxId);
                  for (const file of files) {
                    await sandbox.files.write(file.path, file.content);
                    updatedFiles[file.path] = file.content;
                  }

                  return updatedFiles;
                } catch (e) {
                  return "Error: " + e;
                }
              }
            );
            //step can either be object or string (error), so we wait for object to store it
            if (typeof newFiles === "object") {
              network.state.data.files = newFiles;
            }
          },
        }),
        createTool({
          name: "readFiles",
          description: "Read files from the sandbox",
          parameters: z.object({
            files: z.array(z.string()),
          }),
          handler: async ({ files }, { step }) => {
            return await step?.run("readFiles", async () => {
              try {
                const sandbox = await getSandBox(sandboxId);
                const contents = [];
                for (const file of files) {
                  //read the file content from the sandbox by passing the file path (file)
                  const content = await sandbox.files.read(file);
                  contents.push({ path: file, content });
                }
                return JSON.stringify(contents);
              } catch (e) {
                return "Error reading files: " + e;
              }
            });
          },
        }),
      ],
      lifecycle: {
        onResponse: async ({ result, network }) => {
          const lastAssistantMessageText =
            lastAssistantTextMessageContent(result);

          if (lastAssistantMessageText && network) {
            console.log("network: ", network);
            //store the last assistant message in the network state
            if (lastAssistantMessageText.includes("<task_summary>")) {
              //network.state.data is a user defined storage area for workflow's shared state. We can add any property dynamically to it which we added summary here
              network.state.data.summary = lastAssistantMessageText;
            }
          }
          return result;
        },
      },
    });

    const network = createNetwork<AgentState>({
      name: " coding-agent-network",
      agents: [codeAgent],
      maxIter: 15,
      router: async ({ network }) => {
        const summary = network.state.data.summary;
        if (summary) {
          return;
        }
        // codeAgent will keep calling itself until summary is set i.e. task finishes
        return codeAgent;
      },
    });
    // await step.sleep("wait-a-moment", "10s");
    // Run the agent with the network
    const result = await network.run(event.data.value);

    //something went wrong if this is missing
    const isError =
      !result.state.data.summary ||
      Object.keys(result.state.data.files || {}).length === 0;

    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      const sandbox = await getSandBox(sandboxId);
      //we set the host to port 3000, which is the default for Next.js apps
      const host = sandbox.getHost(3000);
      return `https://${host}`;
    });

    await step.run("save-result", async () => {
      if (isError) {
        //dont create the fragment if there is an error
        return await prisma.message.create({
          data: {
            content: "Something went wrong. Please try again.",
            role: "ASSISTANT",
            type: "ERROR",
          },
        });
      }
      return await prisma.message.create({
        data: {
          content: result.state.data.summary,
          role: "ASSISTANT",
          type: "RESULT",
          fragment: {
            create: {
              sandboxUrl: sandboxUrl,
              title: "Fragment",
              files: result.state.data.files,
            },
          },
        },
      });
    });

    return {
      url: sandboxUrl,
      title: "Fragment",
      files: result.state.data.files,
      summary: result.state.data.summary,
    };
  }
);
