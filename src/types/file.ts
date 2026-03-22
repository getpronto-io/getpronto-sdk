export interface ResolvedFile {
  body: Blob | Buffer;
  filename: string;
  mimeType: string;
  size: number;
}

export interface PresignResponse {
  uploadUrl: string;
  pendingUploadId: string;
  expiresIn: number;
}

export interface FileMetadata {
  id: string;
  name: string;
  secureUrl: string;
  secureThumbnailUrl: string;
  rawUrl: string;
  type: string;
  rawType: string;
  size: string;
  rawSize: number;
  updated: string;
  rawUpdated: string;
  folderId: string | null;
}
