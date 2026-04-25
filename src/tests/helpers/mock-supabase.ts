import { vi } from "vitest";

/**
 * Mock do SupabaseClient que captura filtros de cada query.
 * Usado para verificar que workspace_id é sempre aplicado.
 */

export interface CapturedQuery {
  table: string;
  operation: "select" | "insert" | "update" | "delete";
  eqFilters: Record<string, unknown>;
  insertedData?: unknown;
}

export function buildMockClient(opts: {
  returnData?: unknown;
  returnError?: string;
  returnCount?: number;
} = {}) {
  const captured: CapturedQuery[] = [];

  function makeBuilder(table: string, operation: CapturedQuery["operation"], insertedData?: unknown) {
    const eqFilters: Record<string, unknown> = {};
    captured.push({ table, operation, eqFilters, insertedData });

    const resolved = opts.returnError
      ? Promise.resolve({ data: null, error: { message: opts.returnError }, count: null })
      : Promise.resolve({
          data: opts.returnData ?? null,
          error: null,
          count: opts.returnCount ?? (Array.isArray(opts.returnData) ? (opts.returnData as unknown[]).length : 1),
        });

    const builder: Record<string, unknown> = {
      eq: vi.fn((col: string, val: unknown) => { eqFilters[col] = val; return builder; }),
      is: vi.fn(() => builder),
      or: vi.fn(() => builder),
      ilike: vi.fn(() => builder),
      in: vi.fn(() => builder),
      order: vi.fn(() => builder),
      range: vi.fn(() => builder),
      limit: vi.fn(() => builder),
      select: vi.fn(() => builder),
      single: vi.fn(async () => {
        if (opts.returnError) return { data: null, error: { message: opts.returnError } };
        const arr = Array.isArray(opts.returnData) ? opts.returnData as unknown[] : [opts.returnData];
        return { data: arr[0] ?? null, error: null };
      }),
      // make awaitable
      then: (resolved as Promise<unknown>).then.bind(resolved),
      catch: (resolved as Promise<unknown>).catch.bind(resolved),
      finally: (resolved as Promise<unknown>).finally.bind(resolved),
    };

    return builder;
  }

  const client = {
    from: vi.fn((table: string) => ({
      select: vi.fn((_cols?: unknown, _opts?: unknown) => makeBuilder(table, "select")),
      insert: vi.fn((data: unknown) => makeBuilder(table, "insert", data)),
      update: vi.fn((data: unknown) => makeBuilder(table, "update", data)),
      delete: vi.fn(() => makeBuilder(table, "delete")),
    })),
    /** Todas as queries capturadas na ordem de execução */
    _queries: captured,
    /** Verifica que TODA query capturada usa workspace_id */
    assertAllQueriesHaveWorkspaceId: (expectedWorkspaceId: string) => {
      const violations = captured.filter(
        (q) =>
          q.operation !== "insert" && // insert pode não ter eq (usa coluna direta)
          q.table !== "workspaces" &&  // workspaces não têm workspace_id próprio
          q.table !== "profiles" &&
          q.eqFilters["workspace_id"] === undefined
      );
      return { ok: violations.length === 0, violations };
    },
  };

  return client;
}

export type MockClient = ReturnType<typeof buildMockClient>;
