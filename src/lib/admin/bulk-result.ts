export type BulkResult = {
  succeeded: string[];
  failed: { id: string; error: string }[];
};

export async function runBulk(
  ids: string[],
  fn: (id: string) => Promise<void>,
): Promise<BulkResult> {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  const succeeded: string[] = [];
  const failed: { id: string; error: string }[] = [];

  for (const id of uniqueIds) {
    try {
      await fn(id);
      succeeded.push(id);
    } catch (err) {
      failed.push({
        id,
        error: err instanceof Error ? err.message : "Operation failed",
      });
    }
  }

  return { succeeded, failed };
}

export function bulkResultResponse(result: BulkResult) {
  if (result.succeeded.length === 0) {
    return {
      ok: false as const,
      status: 400,
      body: {
        error: result.failed[0]?.error ?? "No items were updated",
        ...result,
      },
    };
  }
  return { ok: true as const, status: 200, body: result };
}
