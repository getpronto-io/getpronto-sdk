import { ClientConfig } from "../types/config";
import { APIResponse } from "../types/response";

/**
 * Custom error class for API errors that includes detailed information
 */
export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText: string,
    public headers: Record<string, string> = {},
    public body: any = null
  ) {
    super(message);
    this.name = "APIError";
  }
}

/**
 * HTTP client for making API requests
 */
export class HttpClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(config: ClientConfig) {
    this.baseUrl = config.baseUrl || "https://api.getpronto.io/v1";
    this.defaultHeaders = {
      Authorization: `ApiKey ${config.apiKey}`,
      "Content-Type": "application/json",
      ...config.headers,
    };
  }

  /**
   * Makes a GET request
   */
  async get<T>(path: string, options?: RequestInit): Promise<APIResponse<T>> {
    return this.request<T>("GET", path, options);
  }

  /**
   * Makes a POST request
   */
  async post<T>(
    path: string,
    body?: any,
    options?: RequestInit
  ): Promise<APIResponse<T>> {
    const requestOptions: RequestInit = {
      ...options,
      body: body instanceof FormData ? body : JSON.stringify(body),
    };

    return this.request<T>("POST", path, requestOptions);
  }

  /**
   * Makes a DELETE request
   */
  async delete<T>(
    path: string,
    options?: RequestInit
  ): Promise<APIResponse<T>> {
    return this.request<T>("DELETE", path, options);
  }

  /**
   * Makes an HTTP request
   */
  private async request<T>(
    method: string,
    path: string,
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    const url = `${this.baseUrl}${path}`;
    const headers = this.prepareHeaders(options);

    try {
      const response = await fetch(url, {
        method,
        headers,
        ...options,
      });

      const responseHeaders = this.parseHeaders(response.headers);
      const body = await this.parseResponseBody(response);

      if (!response.ok) {
        this.handleErrorResponse(response, responseHeaders, body);
      }

      return {
        data: body,
        status: response.status,
        headers: responseHeaders,
      };
    } catch (error: any) {
      return this.handleRequestError(error);
    }
  }

  /**
   * Prepares request headers by merging defaults with provided options
   */
  private prepareHeaders(options: RequestInit): Record<string, string> {
    let headers = { ...this.defaultHeaders };

    if (options.headers) {
      headers = {
        ...headers,
        ...this.normalizeHeaders(options.headers),
      };
    }

    // For FormData, remove Content-Type to let the browser set it
    if (options.body instanceof FormData) {
      delete headers["Content-Type"];
    }

    return headers;
  }

  /**
   * Converts Headers object to a plain object if needed
   */
  private normalizeHeaders(headers: HeadersInit): Record<string, string> {
    if (headers instanceof Headers) {
      const headerObj: Record<string, string> = {};
      headers.forEach((value, key) => {
        headerObj[key] = value;
      });
      return headerObj;
    }

    if (Array.isArray(headers)) {
      return Object.fromEntries(headers);
    }

    return headers as Record<string, string>;
  }

  /**
   * Converts response headers to a plain object
   */
  private parseHeaders(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * Tries to parse response body as JSON
   */
  private async parseResponseBody(response: Response): Promise<any> {
    try {
      return await response.json();
    } catch (e) {
      return null;
    }
  }

  /**
   * Handles error responses by throwing an APIError
   */
  private handleErrorResponse(
    response: Response,
    headers: Record<string, string>,
    body: any
  ): never {
    const errorMessage =
      body?.message || body?.error || "Unknown error occurred";
    throw new APIError(
      errorMessage,
      response.status,
      response.statusText,
      headers,
      body
    );
  }

  /**
   * Handles request errors (network errors, etc.)
   */
  private handleRequestError(error: any): never {
    // If it's already our APIError, just rethrow it
    if (error instanceof APIError) {
      throw error;
    }

    // For other errors, wrap them in our APIError
    console.error("Request error:", error);
    throw new APIError(
      error.message || "Network error occurred",
      0,
      "NetworkError",
      {},
      null
    );
  }
}
