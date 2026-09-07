import { describe, expect, it, vi } from "vitest";
import { ImageTransformer } from "../src/transformers/image";
import type { HttpClient } from "../src/core/http-client";
import { IMAGE_FORMATS } from "../src/types/image";

const SECURE_URL = "https://api.getpronto.io/v1/file/user-1/photo.jpg";

const httpClient = (secureUrl = SECURE_URL) => {
  const get = vi.fn().mockResolvedValue({ data: { file: { secureUrl } } });
  return { client: { get } as unknown as HttpClient, get };
};

describe("ImageTransformer.toURL", () => {
  it("resolves the file then builds the URL locally", async () => {
    const { client, get } = httpClient();

    const url = await new ImageTransformer("abc", client)
      .resize(800, 600, "contain")
      .quality(85)
      .toURL();

    expect(get).toHaveBeenCalledWith("/files/abc");
    expect(url).toBe(`${SECURE_URL}?w=800&h=600&fit=contain&q=85`);
  });

  it("uses the same serialiser as imageProps, so auto tokens pass through", async () => {
    const { client } = httpClient();

    const url = await new ImageTransformer("abc", client)
      .format("auto")
      .quality("auto")
      .toURL();

    expect(url).toBe(`${SECURE_URL}?format=auto&q=auto`);
  });

  it("keeps the source extension rather than swapping it for the format", async () => {
    // The delivery route reads `format` from the query, and a `.auto` path is invalid.
    const { client } = httpClient();

    const url = await new ImageTransformer("abc", client).format("webp").toURL();

    expect(url).toBe(`${SECURE_URL}?format=webp`);
  });

  it("emits no query string when no options are set", async () => {
    const { client } = httpClient();

    expect(await new ImageTransformer("abc", client).toURL()).toBe(SECURE_URL);
  });

  describe("validation happens before any request", () => {
    it("rejects an out-of-range quality", () => {
      const { client, get } = httpClient();
      expect(() => new ImageTransformer("abc", client).quality(0)).toThrow(/1 and 100/);
      expect(get).not.toHaveBeenCalled();
    });

    it("rejects an unsupported format", () => {
      const { client } = httpClient();
      // "jpg" used to type-check here but the API only accepts "jpeg".
      expect(() => new ImageTransformer("abc", client).format("jpg" as never)).toThrow(
        /Format must be one of/
      );
    });

    it("accepts every documented format and auto", () => {
      const { client } = httpClient();
      for (const format of [...IMAGE_FORMATS, "auto"] as const) {
        expect(() =>
          new ImageTransformer("abc", client).format(format)
        ).not.toThrow();
      }
    });
  });
});
