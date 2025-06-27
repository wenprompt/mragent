import { openai, createAgent } from "@inngest/agent-kit";
import { inngest } from "./client";

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event }) => {
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

    return { output };
  }
);
