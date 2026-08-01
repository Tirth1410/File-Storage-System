interface ListFooterProps {
  totalItems: number;
  loadedItems: number;
  selectedCount: number;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}

export function ListFooter({
  totalItems,
  loadedItems,
  selectedCount,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: ListFooterProps) {
  return (
    <div className="px-4 py-3 border-t border-[#F5F5F5] flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <span className="text-xs text-[#737373]">
        {totalItems} item{totalItems !== 1 ? "s" : ""}
        {selectedCount > 0 && ` (${selectedCount} selected)`}
      </span>
      <span className="flex flex-wrap items-center gap-3">
        {hasMore && (
          <button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="text-xs font-semibold text-[#002FA7] hover:underline disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoadingMore
              ? "Loading more..."
              : `Show more (${totalItems - loadedItems} remaining)`}
          </button>
        )}
        <span className="text-xs text-[#A3A3A3] font-mono">Cloudflare R2</span>
      </span>
    </div>
  );
}
