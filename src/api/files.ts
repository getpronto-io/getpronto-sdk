import { HttpClient } from "../core/http-client";
import { FileMetadata, ResolvedFile, PresignResponse } from "../types/file";
import { APIResponse, PaginatedResponse } from "../types/response";
import { createConfig } from "@jaygould/shared-config-getpronto";

const config = createConfig("", "", null);

export class FileAPI {
  private allowedFileTypes;

  constructor(private httpClient: HttpClient) {
    this.allowedFileTypes = config.uploads.mimeToExtensions;
  }

  async upload(
    file: File | Buffer | string,
    options?: { filename?: string; mimeType?: string }
  ): Promise<APIResponse<FileMetadata>> {
    const resolved = await this.resolveFile(file, options);
    const customFilename =
      options?.filename && !(file instanceof File)
        ? options.filename
        : undefined;

    // Phase 1: Get presigned URL
    const presignRes = await this.httpClient.post<PresignResponse>(
      "/upload/presign",
      {
        filename: resolved.filename,
        mimetype: resolved.mimeType,
        size: resolved.size,
        ...(customFilename && { customFilename }),
      }
    );

    const { uploadUrl, pendingUploadId } = presignRes.data;

    // Phase 2: Upload directly to B2
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": resolved.mimeType,
      },
      body: resolved.body,
    });

    if (!uploadResponse.ok) {
      throw new Error(
        `Direct upload failed with status ${uploadResponse.status}`
      );
    }

    // Phase 3: Confirm upload
    const response = await this.httpClient.post<{ message: string; file: FileMetadata }>("/upload/confirm", {
      pendingUploadId,
    });

    return { ...response, data: response.data.file };
  }

  private async resolveFile(
    file: File | Buffer | string,
    options?: { filename?: string; mimeType?: string }
  ): Promise<ResolvedFile> {
    if (file instanceof File) {
      return this.resolveFileObject(file, options);
    } else if (Buffer.isBuffer(file)) {
      return this.resolveBufferObject(file, options);
    } else if (typeof file === "string") {
      return this.resolveStringInput(file, options);
    }
    throw new Error("Unsupported file type for upload");
  }

  private resolveFileObject(
    file: File,
    options?: { filename?: string; mimeType?: string }
  ): ResolvedFile {
    const filename = options?.filename || file.name;
    let mimeType = options?.mimeType || file.type;
    if (mimeType === "application/octet-stream" || !mimeType) {
      mimeType = this.getMimeTypeFromFilename(filename);
    }

    const body =
      filename !== file.name || mimeType !== file.type
        ? new File([file], filename, { type: mimeType })
        : file;

    return { body, filename, mimeType, size: file.size };
  }

  private resolveBufferObject(
    buffer: Buffer,
    options?: { filename?: string; mimeType?: string }
  ): ResolvedFile {
    const filename = options?.filename || "file";
    const mimeType =
      options?.mimeType || this.getMimeTypeFromFilename(filename);

    return { body: buffer, filename, mimeType, size: buffer.length };
  }

  private async resolveStringInput(
    input: string,
    options?: { filename?: string; mimeType?: string }
  ): Promise<ResolvedFile> {
    if (input.startsWith("data:")) {
      return this.resolveDataUrl(input, options);
    } else if (input.startsWith("http://") || input.startsWith("https://")) {
      return this.resolveRemoteUrl(input, options);
    } else {
      return this.resolveLocalFilePath(input, options);
    }
  }

  private resolveDataUrl(
    dataUrl: string,
    options?: { filename?: string; mimeType?: string }
  ): ResolvedFile {
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

    return { body: blob, filename, mimeType, size: bytes.length };
  }

  private async resolveRemoteUrl(
    url: string,
    options?: { filename?: string; mimeType?: string }
  ): Promise<ResolvedFile> {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch remote file: ${response.statusText}`);
    }

    let filename = options?.filename;

    if (!filename) {
      const contentDisposition = response.headers.get("content-disposition");
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }

      if (!filename) {
        const urlParts = url.split("/");
        let urlFilename = urlParts[urlParts.length - 1];

        const queryIndex = urlFilename.indexOf("?");
        if (queryIndex !== -1) {
          urlFilename = urlFilename.substring(0, queryIndex);
        }

        filename = urlFilename || "download";
      }
    }

    let mimeType = options?.mimeType;

    if (!mimeType) {
      const contentType = response.headers.get("content-type");
      if (contentType) {
        mimeType = contentType.split(";")[0].trim();
      }

      if (!mimeType || mimeType === "application/octet-stream") {
        mimeType = this.getMimeTypeFromFilename(filename);
      }
    }

    const blob = await response.blob();

    return { body: blob, filename, mimeType, size: blob.size };
  }

  private resolveLocalFilePath(
    filePath: string,
    options?: { filename?: string; mimeType?: string }
  ): ResolvedFile {
    const pathParts = filePath.split(/[\/\\]/);
    const filename = options?.filename || pathParts[pathParts.length - 1];
    const mimeType =
      options?.mimeType || this.getMimeTypeFromFilename(filename);

    if (typeof window !== "undefined") {
      throw new Error(
        "File path access is not supported in browser environments"
      );
    }

    const fs = require("fs");
    const fileData: Buffer = fs.readFileSync(filePath);

    return { body: fileData, filename, mimeType, size: fileData.length };
  }

  /**
   * Gets file extension from MIME type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const extensions = (this.allowedFileTypes as any)[mimeType];
    if (extensions && extensions.length > 0) {
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
    const response = await this.httpClient.get<{ file: FileMetadata }>(`/files/${id}`);
    return { ...response, data: response.data.file };
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

    const extension = filename.slice(lastDotIndex).toLowerCase() as any;

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
