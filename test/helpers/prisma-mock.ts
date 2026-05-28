import { vi } from "vitest";

type Fn = ReturnType<typeof vi.fn>;

function createDelegateMock(store: Map<string, Fn>) {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (typeof prop !== "string") {
          return undefined;
        }

        if (!store.has(prop)) {
          store.set(prop, vi.fn(async () => null));
        }

        return store.get(prop);
      },
    },
  ) as Record<string, Fn>;
}

export function createPrismaMock() {
  const delegates = new Map<string, Record<string, Fn>>();

  const getDelegate = (name: string) => {
    if (!delegates.has(name)) {
      delegates.set(name, createDelegateMock(new Map<string, Fn>()));
    }

    return delegates.get(name)!;
  };

  const tx = new Proxy(
    {
      $executeRaw: vi.fn(async () => 0),
    },
    {
      get(target, prop) {
        if (prop in target) {
          return (target as Record<string, unknown>)[prop as string];
        }

        if (typeof prop !== "string") {
          return undefined;
        }

        return getDelegate(prop);
      },
    },
  );

  const prisma = new Proxy(
    {
      $disconnect: vi.fn(async () => undefined),
      $executeRaw: vi.fn(async () => 0),
      $transaction: vi.fn(async (input: unknown) => {
        if (typeof input === "function") {
          return input(tx);
        }

        if (Array.isArray(input)) {
          return Promise.all(input);
        }

        return null;
      }),
    },
    {
      get(target, prop) {
        if (prop in target) {
          return (target as Record<string, unknown>)[prop as string];
        }

        if (typeof prop !== "string") {
          return undefined;
        }

        return getDelegate(prop);
      },
    },
  );

  return prisma as Record<string, unknown>;
}
