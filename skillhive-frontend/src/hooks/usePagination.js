import { useCallback, useMemo, useState } from "react";

function usePagination({
  initialPage = 1,
  initialPageSize = 10,
} = {}) {
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const goToPage = useCallback((nextPage) => {
    const normalizedPage = Math.max(1, Number(nextPage) || 1);
    setPage(normalizedPage);
  }, []);

  const nextPage = useCallback((totalPages) => {
    setPage((currentPage) =>
      currentPage < totalPages
        ? currentPage + 1
        : currentPage
    );
  }, []);

  const previousPage = useCallback(() => {
    setPage((currentPage) =>
      Math.max(1, currentPage - 1)
    );
  }, []);

  const changePageSize = useCallback((nextPageSize) => {
    const normalizedPageSize = Math.max(
      1,
      Number(nextPageSize) || initialPageSize
    );

    setPageSize(normalizedPageSize);
    setPage(1);
  }, [initialPageSize]);

  const resetPagination = useCallback(() => {
    setPage(initialPage);
    setPageSize(initialPageSize);
  }, [initialPage, initialPageSize]);

  const getPaginationParams = useCallback(() => {
    return {
      page,
      page_size: pageSize,
    };
  }, [page, pageSize]);

  const value = useMemo(
    () => ({
      page,
      pageSize,
      goToPage,
      nextPage,
      previousPage,
      changePageSize,
      resetPagination,
      getPaginationParams,
    }),
    [
      page,
      pageSize,
      goToPage,
      nextPage,
      previousPage,
      changePageSize,
      resetPagination,
      getPaginationParams,
    ]
  );

  return value;
}

export default usePagination;