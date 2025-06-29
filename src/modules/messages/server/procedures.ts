import { z } from "zod";

import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { prisma } from "@/lib/db";
import { inngest } from "@/inngest/client";

export const messagesRouter = createTRPCRouter({
  getMany: baseProcedure
    .input(
      z.object({
        projectId: z.string().min(1, { message: "Project ID is required" }),
      })
    )
    .query(async ({ input }) => {
      const messages = await prisma.message.findMany({
        where: {
          projectId: input.projectId,
        },
        orderBy: {
          updatedAt: "asc",
        },
        include: {
          fragment: true, // Include the fragment relation
        },
      });
      return messages;
    }),
  create: baseProcedure
    .input(
      z.object({
        value: z
          .string()
          .min(1, { message: "Value is required" })
          .max(10000, { message: "Value is too long" }),
        projectId: z.string().min(1, { message: "Project ID is required" }),
      })
    )
    .mutation(async ({ input }) => {
      const newMessage = await prisma.message.create({
        data: {
          content: input.value,
          role: "USER",
          type: "RESULT",
          projectId: input.projectId,
        },
      });
      await inngest.send({
        name: "code-agent/run", //from functions.ts
        data: {
          value: input.value,
          projectId: input.projectId,
        },
      });
      return newMessage;
    }),
});
