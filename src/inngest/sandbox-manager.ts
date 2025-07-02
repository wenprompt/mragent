import { Sandbox } from "@e2b/code-interpreter";
import { prisma } from "@/lib/db";

export interface SandboxInfo {
  sandboxId: string;
  isReused: boolean;
}

export function isActiveSandbox(project: { activeSandboxId: string | null; sandboxExpiresAt: Date | null }): boolean {
  if (!project.activeSandboxId || !project.sandboxExpiresAt) {
    return false;
  }
  
  return new Date() < project.sandboxExpiresAt;
}

export async function getOrCreateProjectSandbox(
  projectId: string,
  previousFiles?: Record<string, string>
): Promise<SandboxInfo> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { activeSandboxId: true, sandboxExpiresAt: true }
  });

  if (project && isActiveSandbox(project)) {
    try {
      const existingSandbox = await Sandbox.connect(project.activeSandboxId!);
      
      if (existingSandbox) {
        console.log(`Reusing existing sandbox: ${project.activeSandboxId}`);
        return {
          sandboxId: project.activeSandboxId!,
          isReused: true
        };
      }
    } catch (error) {
      console.log(`Failed to connect to existing sandbox: ${error}`);
    }
  }

  const sandbox = await Sandbox.create("mragent-nextjs-test-2");
  console.log(`Created new sandbox: ${sandbox.sandboxId}`);

  if (previousFiles && Object.keys(previousFiles).length > 0) {
    await syncFilesToSandbox(sandbox, previousFiles);
  }

  const sandboxExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now (E2B default timeout)

  await prisma.project.update({
    where: { id: projectId },
    data: {
      activeSandboxId: sandbox.sandboxId,
      sandboxExpiresAt: sandboxExpiresAt
    }
  });

  return {
    sandboxId: sandbox.sandboxId,
    isReused: false
  };
}

export async function syncFilesToSandbox(
  sandbox: Sandbox,
  files: Record<string, string>
): Promise<void> {
  try {
    console.log(`Syncing ${Object.keys(files).length} files to sandbox`);
    
    for (const [path, content] of Object.entries(files)) {
      await sandbox.files.write(path, content);
    }
    
    console.log("File synchronization completed");
  } catch (error) {
    console.error("Error syncing files to sandbox:", error);
    throw error;
  }
}

export async function cleanupExpiredSandboxes(): Promise<void> {
  const expiredProjects = await prisma.project.findMany({
    where: {
      sandboxExpiresAt: {
        lt: new Date()
      },
      activeSandboxId: {
        not: null
      }
    }
  });

  for (const project of expiredProjects) {
    // E2B sandboxes auto-cleanup on expiration, so we just need to clear our tracking
    console.log(`Cleaning up expired sandbox tracking for ${project.activeSandboxId}`);
    
    await prisma.project.update({
      where: { id: project.id },
      data: {
        activeSandboxId: null,
        sandboxExpiresAt: null
      }
    });
  }

  console.log(`Cleaned up ${expiredProjects.length} expired sandboxes`);
}

export async function getLatestProjectFiles(projectId: string): Promise<Record<string, string> | undefined> {
  const latestFragment = await prisma.fragment.findFirst({
    where: {
      message: {
        projectId: projectId,
        role: "ASSISTANT",
        type: "RESULT"
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  if (!latestFragment?.files) {
    return undefined;
  }

  const files = latestFragment.files as Record<string, string>;
  return files;
}