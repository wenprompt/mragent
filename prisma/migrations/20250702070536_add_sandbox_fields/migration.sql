-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "activeSandboxId" TEXT,
ADD COLUMN     "sandboxExpiresAt" TIMESTAMP(3);
