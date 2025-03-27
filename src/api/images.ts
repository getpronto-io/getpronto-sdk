import { HttpClient } from "../core/http-client";
import { ImageTransformer } from "../transformers/image";

export class ImageAPI {
  constructor(private httpClient: HttpClient) {}

  transform(fileId: string) {
    return new ImageTransformer(fileId, this.httpClient);
  }
}
