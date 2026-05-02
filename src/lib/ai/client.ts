import prisma from "../prisma";

type AiClient = {
  userAiConfig: {
    findUnique: (args: unknown) => Promise<unknown>;
    upsert: (args: unknown) => Promise<unknown>;
  };
  aiConversation: {
    findMany: (args: unknown) => Promise<unknown[]>;
    findFirst: (args: unknown) => Promise<unknown>;
    create: (args: unknown) => Promise<unknown>;
    update: (args: unknown) => Promise<unknown>;
    updateMany: (args: unknown) => Promise<{ count: number }>;
    deleteMany: (args: unknown) => Promise<{ count: number }>;
  };
  userAiConnection: {
    findMany: (args: unknown) => Promise<unknown[]>;
    findFirst: (args: unknown) => Promise<unknown>;
    findUnique: (args: unknown) => Promise<unknown>;
    create: (args: unknown) => Promise<unknown>;
    update: (args: unknown) => Promise<unknown>;
    updateMany: (args: unknown) => Promise<{ count: number }>;
    deleteMany: (args: unknown) => Promise<{ count: number }>;
  };
  aiMessage: {
    findMany: (args: unknown) => Promise<unknown[]>;
    createMany: (args: unknown) => Promise<{ count: number }>;
  };
};

export function getAiClient(): AiClient {
  const candidate = prisma as unknown as Partial<AiClient>;

  if (!candidate.userAiConfig || !candidate.userAiConnection || !candidate.aiConversation || !candidate.aiMessage) {
    throw new Error("Prisma client desactualizado. Reinicia el servidor y ejecuta prisma generate.");
  }

  return candidate as AiClient;
}
