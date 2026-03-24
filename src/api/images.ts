import { HttpClient } from "../core/http-client";
import { ApiKeyType } from "../core/getpronto-client";
import { ImageTransformer } from "../transformers/image";

export class ImageAPI {
  private keyType: ApiKeyType;

  constructor(private httpClient: HttpClient, keyType: ApiKeyType) {
    this.keyType = keyType;
  }

  transform(fileId: string) {
    if (this.keyType === "public") {
      throw new Error(
        "images.transform() requires a secret API key. Use URL query parameters for transforms with public keys."
      );
    }
    return new ImageTransformer(fileId, this.httpClient);
  }
}
