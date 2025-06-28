import { openai, createAgent } from "@inngest/agent-kit";
import { Sandbox } from "@e2b/code-interpreter";

import { inngest } from "./client";
import { getSandBox } from "./utils";

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event, step }) => {
    const sandboxId = await step.run("get-sandbox-id", async () => {
      const sandbox = await Sandbox.create("mragent-nextjs-test-2");
      return sandbox.sandboxId;
    });
    // Create a new agent with a system prompt (you can add optional tools, too)
    const codeAgent = createAgent({
      name: "code-agent",
      system:
        "You are an expert nextjs developer. You write readable, maintainable code. You write simple nextjs and react snippets",
      model: openai({ model: "gpt-4o" }),
    });
    // await step.sleep("wait-a-moment", "10s");
    const { output } = await codeAgent.run(
      `write the following snippet: ${event.data.value}`
    );

    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      const sandbox = await getSandBox(sandboxId);
      //we set the host to port 3000, which is the default for Next.js apps
      const host = sandbox.getHost(3000);
      return `https://${host}`;
    });

    return { output, sandboxUrl };
  }
);
