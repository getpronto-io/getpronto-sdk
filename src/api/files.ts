import { HttpClient } from "../core/http-client";
import { FileMetadata } from "../types/file";
import { APIResponse, PaginatedResponse } from "../types/response";
import { createConfig } from "@jaygould/shared-config-getpronto";

const config = createConfig("", "", null);

export class FileAPI {
  private allowedFileTypes;

  constructor(private httpClient: HttpClient) {
    this.allowedFileTypes = config.uploads.allowedFileTypes;
  }

  async upload(
    file: File | Buffer | string,
    options?: { filename?: string; mimeType?: string }
  ): Promise<APIResponse<FileMetadata>> {
    const formData = new FormData();

    if (file instanceof File) {
      this.handleFileObject(file, formData, options);
    } else if (Buffer.isBuffer(file)) {
      this.handleBufferObject(file, formData, options);
    } else if (typeof file === "string") {
      await this.handleStringInput(file, formData, options);
    } else {
      throw new Error("Unsupported file type for upload");
    }

    if (options?.filename && !(file instanceof File)) {
      formData.append("customFilename", options.filename);
    }

    return this.httpClient.post<FileMetadata>("/upload", formData);
  }

  /**
   * Handle File object input
   */
  private handleFileObject(
    file: File,
    formData: FormData,
    options?: { filename?: string; mimeType?: string }
  ): void {
    // Get filename from options or use original filename
    const filename = options?.filename || file.name;

    // Get MIME type from options, or use original if valid, or infer from filename
    let mimeType = options?.mimeType || file.type;
    if (mimeType === "application/octet-stream" || !mimeType) {
      mimeType = this.getMimeTypeFromFilename(filename);
    }

    // Only create a new File if something changed
    if (filename !== file.name || mimeType !== file.type) {
      const newFile = new File([file], filename, { type: mimeType });
      formData.append("file", newFile);
    } else {
      formData.append("file", file);
    }
  }
  /**
   * Handle Buffer object input
   */
  private handleBufferObject(
    buffer: Buffer,
    formData: FormData,
    options?: { filename?: string; mimeType?: string }
  ): void {
    // For Buffer, we need to determine the MIME type
    const filename = options?.filename || "file";

    // Use provided MIME type or try to infer it from filename
    const mimeType =
      options?.mimeType || this.getMimeTypeFromFilename(filename);

    // Create a File object with the correct MIME type
    const fileObj = new File([buffer], filename, { type: mimeType });
    formData.append("file", fileObj);
  }

  /**
   * Handle string input (data URL, local file path, or remote URL)
   */
  private async handleStringInput(
    input: string,
    formData: FormData,
    options?: { filename?: string; mimeType?: string }
  ): Promise<void> {
    // Handle data URLs (base64 encoded data)
    if (input.startsWith("data:")) {
      this.handleDataUrl(input, formData, options);
    }
    // Handle remote URLs (http/https)
    else if (input.startsWith("http://") || input.startsWith("https://")) {
      await this.handleRemoteUrl(input, formData, options);
    }
    // Handle as local file path
    else {
      this.handleLocalFilePath(input, formData, options);
    }
  }

  /**
   * Handle data URL input
   */
  private handleDataUrl(
    dataUrl: string,
    formData: FormData,
    options?: { filename?: string; mimeType?: string }
  ): void {
    const matches = dataUrl.match(
      /^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.*)$/
    );

    if (!matches || matches.length !== 3) {
      throw new Error("Invalid data URL format");
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const filename =
      options?.filename || `file.${this.getExtensionFromMimeType(mimeType)}`;
    const blob = new Blob([bytes], { type: mimeType });
    const fileObj = new File([blob], filename, { type: mimeType });

    formData.append("file", fileObj);
  }

  /**
   * Handle remote URL input
   */
  private async handleRemoteUrl(
    url: string,
    formData: FormData,
    options?: { filename?: string; mimeType?: string }
  ): Promise<void> {
    try {
      // Fetch the remote file
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch remote file: ${response.statusText}`);
      }

      // Get the filename from Content-Disposition header or from URL
      let filename = options?.filename;

      if (!filename) {
        // Try to get filename from Content-Disposition header
        const contentDisposition = response.headers.get("content-disposition");
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="(.+)"/);
          if (filenameMatch && filenameMatch[1]) {
            filename = filenameMatch[1];
          }
        }

        // If still no filename, extract it from URL
        if (!filename) {
          const urlParts = url.split("/");
          let urlFilename = urlParts[urlParts.length - 1];

          // Remove query parameters if present
          const queryIndex = urlFilename.indexOf("?");
          if (queryIndex !== -1) {
            urlFilename = urlFilename.substring(0, queryIndex);
          }

          filename = urlFilename || "download";
        }
      }

      // Get MIME type from Content-Type header, options, or filename
      let mimeType = options?.mimeType;

      if (!mimeType) {
        const contentType = response.headers.get("content-type");
        if (contentType) {
          // Remove charset and other parameters if present
          mimeType = contentType.split(";")[0].trim();
        }

        // If still no MIME type or it's octet-stream, try to infer from filename
        if (!mimeType || mimeType === "application/octet-stream") {
          mimeType = this.getMimeTypeFromFilename(filename);
        }
      }

      // Convert the response to a blob
      const blob = await response.blob();

      // Create a File object with the determined MIME type
      const fileObj = new File([blob], filename, { type: mimeType });
      formData.append("file", fileObj);
    } catch (error: any) {
      throw new Error(`Failed to process remote URL: ${error.message}`);
    }
  }

  /**
   * Handle local file path input
   */
  private handleLocalFilePath(
    filePath: string,
    formData: FormData,
    options?: { filename?: string; mimeType?: string }
  ): void {
    // Extract just the filename from the path
    const pathParts = filePath.split(/[\/\\]/);
    const filename = options?.filename || pathParts[pathParts.length - 1];

    // Determine the MIME type based on the filename
    const mimeType =
      options?.mimeType || this.getMimeTypeFromFilename(filename);

    // In browser environments, we can't directly access the file system
    if (typeof window !== "undefined") {
      throw new Error(
        "File path access is not supported in browser environments"
      );
    } else {
      // For Node.js environments
      try {
        // This will only work in Node.js environments
        const fs = require("fs");

        // Read the file
        const fileData = fs.readFileSync(filePath);

        // Convert Buffer to a File object
        // Note: In Node.js 18+, File is available globally
        if (typeof File !== "undefined") {
          const fileObj = new File([fileData], filename, { type: mimeType });
          formData.append("file", fileObj);
        } else {
          // For Node.js environments without File constructor
          const nodeStream = require("stream");
          const { Readable } = nodeStream;

          // Create a readable stream from buffer
          const stream = new Readable();
          stream.push(fileData);
          stream.push(null); // End of stream

          // Use stream as file (works with form-data package)
          formData.append("file", stream, filename);
        }
      } catch (err: any) {
        throw new Error(`Failed to read file from path: ${err.message}`);
      }
    }
  }

  /**
   * Gets file extension from MIME type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const extensions = this.allowedFileTypes[mimeType];
    if (extensions && extensions.length > 0) {
      // Return the first extension without the dot
      const ext = extensions[0];
      return ext.startsWith(".") ? ext.substring(1) : ext;
    }
    return "bin"; // Default extension
  }

  async list(options?: {
    page?: number;
    pageSize?: number;
  }): Promise<APIResponse<PaginatedResponse<FileMetadata>>> {
    const params = new URLSearchParams();
    if (options?.page) params.append("page", options.page.toString());
    if (options?.pageSize)
      params.append("pageSize", options.pageSize.toString());

    return this.httpClient.get<PaginatedResponse<FileMetadata>>(
      `/files?${params}`
    );
  }

  async get(id: string): Promise<APIResponse<FileMetadata>> {
    return this.httpClient.get<FileMetadata>(`/files/${id}`);
  }

  async delete(id: string): Promise<APIResponse<void>> {
    return this.httpClient.delete<void>(`/files/${id}`);
  }

  /**
   * Determines the MIME type based on file extension
   *
   * @param filename The name of the file
   * @returns The determined MIME type or application/octet-stream if unknown
   */
  private getMimeTypeFromFilename(filename: string): string {
    // Extract extension (with the dot)
    const lastDotIndex = filename.lastIndexOf(".");
    if (lastDotIndex === -1) {
      return "application/octet-stream"; // No extension found
    }

    const extension = filename.slice(lastDotIndex).toLowerCase();

    // Search through the allowed file types to find matching extension
    for (const [mimeType, extensions] of Object.entries(
      this.allowedFileTypes
    )) {
      if (extensions.includes(extension)) {
        return mimeType;
      }
    }

    // Default MIME type if extension not recognized
    return "application/octet-stream";
  }

  /**
   * Validates if a file's MIME type is allowed
   *
   * @param mimeType The MIME type to check
   * @returns True if the MIME type is allowed, false otherwise
   */
  isAllowedMimeType(mimeType: string): boolean {
    return Object.keys(this.allowedFileTypes).includes(mimeType);
  }

  /**
   * Gets the list of all allowed file extensions
   *
   * @returns Array of allowed file extensions
   */
  getAllowedExtensions(): string[] {
    return Object.values(this.allowedFileTypes).flat();
  }

  /**
   * Gets the list of all allowed MIME types
   *
   * @returns Array of allowed MIME types
   */
  getAllowedMimeTypes(): string[] {
    return Object.keys(this.allowedFileTypes);
  }
}
