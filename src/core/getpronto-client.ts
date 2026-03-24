import { FileAPI } from "../api/files";
import { ImageAPI } from "../api/images";
import { ClientConfig } from "../types/config";
import { HttpClient } from "./http-client";

export type ApiKeyType = "public" | "secret";

export class GetProntoClient {
  private httpClient: HttpClient;
  public files: FileAPI;
  public images: ImageAPI;
  public readonly keyType: ApiKeyType;

  constructor(config: ClientConfig) {
    this.keyType = this.detectKeyType(config.apiKey);
    this.httpClient = new HttpClient(config);
    this.files = new FileAPI(this.httpClient, this.keyType);
    this.images = new ImageAPI(this.httpClient, this.keyType);
  }

  private detectKeyType(apiKey: string): ApiKeyType {
    if (apiKey.startsWith("pronto_pk_")) return "public";
    return "secret";
  }
}

export default GetProntoClient;
