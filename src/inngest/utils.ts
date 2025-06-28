import { Sandbox } from "@e2b/code-interpreter";

export async function getSandBox(sandboxId: string) {
  //establish a live connection to an existing sandbox instance
  const sandbox = await Sandbox.connect(sandboxId);
  return sandbox;
}
