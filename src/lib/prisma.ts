import { PrismaClient } from "@prisma/client";

type GlobalWithPrisma = typeof globalThis & {
  prisma?: PrismaClient;
};

const prismaGlobal = globalThis as GlobalWithPrisma;

function createPrismaClient() {
  return new PrismaClient();
}

function hasAiDelegates(client: PrismaClient): boolean {
  const candidate = client as unknown as {
    userAiConfig?: unknown;
    userAiConnection?: unknown;
    aiConversation?: unknown;
    aiMessage?: unknown;
  };

  return Boolean(candidate.userAiConfig && candidate.userAiConnection && candidate.aiConversation && candidate.aiMessage);
}

const cachedClient = prismaGlobal.prisma;

const prisma =
  cachedClient && hasAiDelegates(cachedClient)
    ? cachedClient
    : createPrismaClient();

if (cachedClient && cachedClient !== prisma) {
  void cachedClient.$disconnect().catch(() => undefined);
}

if (process.env.NODE_ENV !== "production") {
  prismaGlobal.prisma = prisma;
}

export default prisma;
