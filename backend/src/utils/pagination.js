import { AppError } from "./errors.js";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-7][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseCursorPagination(query = {}) {
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  let cursor = null;

  if (query.cursor) {
    const rawCursor = String(query.cursor).trim();
    if (!UUID_REGEX.test(rawCursor)) {
      throw new AppError("VALIDATION_ERROR", 400, "Pagination cursor must be a valid UUID.");
    }
    cursor = rawCursor;
  }

  return { limit, cursor };
}

export function formatPaginatedResponse(items, limit, cursorField = "id") {
  const hasNextPage = items.length > limit;
  const data = hasNextPage ? items.slice(0, limit) : items;
  const nextCursor = hasNextPage && data.length > 0 ? data[data.length - 1][cursorField] : null;

  return {
    data,
    pagination: {
      limit,
      count: data.length,
      hasNextPage,
      nextCursor
    }
  };
}
