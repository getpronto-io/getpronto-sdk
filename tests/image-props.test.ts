import { describe, expect, it } from "vitest";
import { imageProps, RESPONSIVE_WIDTHS } from "../src/transformers/image-props";
import { buildTransformUrl } from "../src/core/build-transform-url";
import type { FileMetadata } from "../src/types/file";

const file = (overrides: Partial<FileMetadata> = {}): FileMetadata =>
  ({
    id: "f1",
    name: "photo.jpg",
    secureUrl: "https://api.getpronto.io/v1/file/user-1/photo.jpg",
    secureThumbnailUrl: "",
    rawUrl: "",
    type: "image/jpeg",
    rawType: "image/jpeg",
    size: "1 MB",
    rawSize: 1048576,
    updated: "",
    rawUpdated: "",
    folderId: null,
    ...overrides,
  }) as FileMetadata;

describe("buildTransformUrl", () => {
  it("appends params without touching the path", () => {
    const url = buildTransformUrl(
      "https://api.getpronto.io/v1/file/user-1/photo.jpg",
      { w: 800, format: "auto", q: "auto" }
    );
    expect(url).toBe(
      "https://api.getpronto.io/v1/file/user-1/photo.jpg?w=800&format=auto&q=auto"
    );
  });

  it("keeps the source extension for format=auto", () => {
    // The delivery route reads `format` from the query and rejects a `.auto` path.
    const url = buildTransformUrl(
      "https://api.getpronto.io/v1/file/user-1/photo.jpg",
      { format: "auto" }
    );
    expect(url).toContain("/photo.jpg?");
    expect(url).not.toContain(".auto");
  });

  it("omits undefined params", () => {
    const url = buildTransformUrl("https://x.test/a.jpg", {
      w: 100,
      h: undefined,
    });
    expect(url).toBe("https://x.test/a.jpg?w=100");
  });

  it("encodes paths containing spaces", () => {
    const url = buildTransformUrl("https://x.test/my%20photo.jpg", { w: 100 });
    expect(url).toBe("https://x.test/my%20photo.jpg?w=100");
  });
});

describe("imageProps", () => {
  it("builds a srcset across the default widths", () => {
    const props = imageProps(file());
    const descriptors = props.srcSet.split(", ").map((c) => c.split(" ")[1]);
    expect(descriptors).toEqual(RESPONSIVE_WIDTHS.default.map((w) => `${w}w`));
  });

  it("uses the largest candidate as src", () => {
    expect(imageProps(file()).src).toContain("w=1600");
  });

  it("passes sizes through and omits it when absent", () => {
    expect(imageProps(file(), { sizes: "50vw" }).sizes).toBe("50vw");
    expect(imageProps(file()).sizes).toBeUndefined();
  });

  it("includes intrinsic dimensions when the file has them", () => {
    const props = imageProps(file({ width: 2000, height: 1000 }));
    expect(props.width).toBe(2000);
    expect(props.height).toBe(1000);
  });

  it("omits dimensions when only one is known", () => {
    const props = imageProps(file({ width: 2000 }));
    expect(props.width).toBeUndefined();
    expect(props.height).toBeUndefined();
  });

  it("omits dimensions for a bare URL", () => {
    const props = imageProps("https://api.getpronto.io/v1/file/user-1/photo.jpg");
    expect(props.width).toBeUndefined();
    expect(props.srcSet).toContain("w=400");
  });

  it("forwards transform options to every candidate", () => {
    const props = imageProps(file(), { format: "auto", q: "auto" });
    for (const candidate of props.srcSet.split(", ")) {
      expect(candidate).toContain("format=auto");
      expect(candidate).toContain("q=auto");
    }
  });

  // Copied verbatim from the readme and the Next.js guide. The first release
  // shipped docs using `quality`, which is not the option name — it was forwarded
  // as an unknown query param and silently ignored by the API.
  it("matches the documented example exactly", () => {
    const props = imageProps(file({ width: 2000, height: 1000 }), {
      widths: [400, 800, 1200],
      sizes: "(max-width: 768px) 100vw, 50vw",
      format: "auto",
      q: "auto",
    });

    expect(props.sizes).toBe("(max-width: 768px) 100vw, 50vw");
    expect(props.width).toBe(2000);
    expect(props.height).toBe(1000);
    expect(props.src).toBe(
      "https://api.getpronto.io/v1/file/user-1/photo.jpg?format=auto&q=auto&w=1200"
    );
    expect(props.srcSet.split(", ")).toHaveLength(3);
  });

  it("rejects an unknown option instead of forwarding it to the URL", () => {
    // The API ignores query params it does not know, so a silent pass-through
    // would look like it worked while doing nothing.
    expect(() =>
      imageProps(file(), { quality: "auto" } as never)
    ).toThrow(/unknown option\(s\) quality/);
  });

  describe("width clamping", () => {
    it("drops candidates wider than the source", () => {
      // Advertising 1600w for a 900px source makes the browser download the biggest
      // candidate and receive fewer pixels than promised.
      const props = imageProps(file({ width: 900, height: 600 }));
      expect(props.srcSet).toContain("400w");
      expect(props.srcSet).toContain("800w");
      expect(props.srcSet).not.toContain("1200w");
      expect(props.srcSet).not.toContain("1600w");
    });

    it("falls back to the source width when every candidate is too wide", () => {
      const props = imageProps(file({ width: 300, height: 200 }));
      expect(props.srcSet).toContain("300w");
      expect(props.srcSet).toContain("w=300");
    });

    it("does not clamp when the source width is unknown", () => {
      expect(imageProps(file()).srcSet).toContain("1600w");
    });
  });

  describe("bounds", () => {
    it("sorts and de-duplicates widths", () => {
      const props = imageProps(file(), { widths: [800, 400, 800] });
      expect(props.srcSet.split(", ").map((c) => c.split(" ")[1])).toEqual([
        "400w",
        "800w",
      ]);
    });

    it("rejects more widths than the cap", () => {
      const tooMany = Array.from({ length: RESPONSIVE_WIDTHS.maxCount + 1 }, (_, i) => (i + 1) * 100);
      expect(() => imageProps(file(), { widths: tooMany })).toThrow(/at most/);
    });

    it("rejects a list with no usable widths", () => {
      expect(() => imageProps(file(), { widths: [0, -5, 99999] })).toThrow(
        /no valid widths/
      );
    });
  });
});
