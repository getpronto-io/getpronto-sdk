export interface APIResponse<T> {
  data: T;
  status: number;
  headers?: Record<string, string>;
}

export interface PaginatedResponse<T> {
  files: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}
