import { Prisma } from "@/app/generated/prisma/client";

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

export function parseLimit(raw: string | null): number {
  if (!raw) return DEFAULT_PAGE_SIZE;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return DEFAULT_PAGE_SIZE;
  return Math.min(parsed, MAX_PAGE_SIZE);
}

export function encodeFileCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.toISOString()}|${id}`).toString("base64url");
}

export function decodeFileCursor(
  cursor: string,
): { createdAt: Date; id: string } {
  let decoded: string;
  try {
    decoded = Buffer.from(cursor, "base64url").toString("utf8");
  } catch {
    throw new Error("Invalid cursor");
  }
  const separatorIndex = decoded.lastIndexOf("|");
  if (separatorIndex === -1) {
    throw new Error("Invalid cursor");
  }
  const createdAt = new Date(decoded.slice(0, separatorIndex));
  const id = decoded.slice(separatorIndex + 1);
  if (Number.isNaN(createdAt.getTime()) || id.length === 0) {
    throw new Error("Invalid cursor");
  }
  return { createdAt, id };
}

export function fileCursorWhere(cursor: string | null): Prisma.FileWhereInput {
  if (!cursor) return {};
  const { createdAt, id } = decodeFileCursor(cursor);
  return {
    OR: [
      { createdAt: { lt: createdAt } },
      { createdAt, id: { lt: id } },
    ],
  };
}

export const FILE_CURSOR_ORDER_BY: Prisma.FileOrderByWithRelationInput[] = [
  { createdAt: "desc" },
  { id: "desc" },
];

export function computeFilePage<T extends { createdAt: Date; id: string }>(
  rows: T[],
  limit: number,
): { items: T[]; hasMore: boolean; nextCursor: string | null } {
  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit);
  const last = items[items.length - 1];
  return {
    items,
    hasMore,
    nextCursor: hasMore && last ? encodeFileCursor(last.createdAt, last.id) : null,
  };
}
