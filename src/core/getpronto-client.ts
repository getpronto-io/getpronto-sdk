import { FileAPI } from "../api/files";
import { ImageAPI } from "../api/images";
import { ClientConfig } from "../types/config";
import { HttpClient } from "./http-client";

export class GetProntoClient {
  private httpClient: HttpClient;
  public files: FileAPI;
  public images: ImageAPI;

  constructor(config: ClientConfig) {
    this.httpClient = new HttpClient(config);
    this.files = new FileAPI(this.httpClient);
    this.images = new ImageAPI(this.httpClient);
  }
}

export default GetProntoClient;
