import { buildTransformUrl } from "../core/build-transform-url";
import type { FileMetadata } from "../types/file";
import { TRANSFORM_BOUNDS } from "../types/image";
import type { ImageProps, ImagePropsOptions, TransformOptions } from "../types/image";

/** Defaults for srcset candidates. Per-width limits come from TRANSFORM_BOUNDS.w. */
export const RESPONSIVE_WIDTHS = {
  /**
   * Sensible spread of display sizes. Kept short on purpose: every width is a
   * separate stored derivative and a separate transform against the account's
   * quota, so an unbounded list lets one `<img>` eat a month's allowance.
   */
  default: [400, 800, 1200, 1600],
  /** Ceiling on candidates per image, for the same reason. */
  maxCount: 6,
};

/**
 * Build `<img>` attributes for a responsively-sized, optimised image.
 *
 * Synchronous, credential-free and makes no API call — it only rewrites a URL the
 * caller already has. Returns attributes rather than markup so it spreads into JSX
 * and leaves alt text, styling and loading behaviour to the caller.
 */
export function imageProps(
  file: FileMetadata | string,
  options: ImagePropsOptions = {}
): ImageProps {
  const { widths, sizes, ...transform } = options;

  assertKnownOptions(transform);

  const baseUrl = typeof file === "string" ? file : file.secureUrl;
  const sourceWidth = typeof file === "string" ? undefined : file.width;
  const sourceHeight = typeof file === "string" ? undefined : file.height;

  const candidates = resolveWidths(widths ?? RESPONSIVE_WIDTHS.default, sourceWidth);

  // The largest candidate is the src, so a browser ignoring srcset still gets
  // something sized for a large display rather than the full-resolution original.
  const fallbackWidth = candidates[candidates.length - 1];

  const props: ImageProps = {
    src: buildTransformUrl(baseUrl, { ...transform, w: fallbackWidth }),
    srcSet: candidates
      .map(
        (width) =>
          `${buildTransformUrl(baseUrl, { ...transform, w: width })} ${width}w`
      )
      .join(", "),
  };

  if (sizes) props.sizes = sizes;

  // Without both, the browser cannot reserve space and the page shifts on load.
  if (sourceWidth && sourceHeight) {
    props.width = sourceWidth;
    props.height = sourceHeight;
  }

  return props;
}

/**
 * Every transform param, so a typo cannot be forwarded to the API as an unknown
 * query param. The API ignores what it does not recognise, which means a misspelt
 * option would silently do nothing instead of failing.
 */
const TRANSFORM_KEYS: (keyof TransformOptions)[] = [
  "w",
  "h",
  "fit",
  "q",
  "blur",
  "sharp",
  "gray",
  "rot",
  "border",
  "crop",
  "format",
];

function assertKnownOptions(options: Record<string, unknown>): void {
  const unknown = Object.keys(options).filter(
    (key) => !TRANSFORM_KEYS.includes(key as keyof TransformOptions)
  );

  if (unknown.length > 0) {
    throw new Error(
      `imageProps: unknown option(s) ${unknown.join(", ")}. Valid options: widths, sizes, ${TRANSFORM_KEYS.join(", ")}`
    );
  }
}

function resolveWidths(
  requested: number[],
  sourceWidth: number | undefined
): number[] {
  const valid = requested
    .filter((w) => Number.isInteger(w) && w >= TRANSFORM_BOUNDS.w.min && w <= TRANSFORM_BOUNDS.w.max)
    .sort((a, b) => a - b);

  const unique = [...new Set(valid)];

  if (unique.length === 0) {
    throw new Error("imageProps: no valid widths supplied");
  }

  if (unique.length > RESPONSIVE_WIDTHS.maxCount) {
    throw new Error(
      `imageProps: at most ${RESPONSIVE_WIDTHS.maxCount} widths are allowed, received ${unique.length}`
    );
  }

  if (!sourceWidth) return unique;

  // Advertising a candidate wider than the source is a lie the browser acts on: it
  // downloads the biggest one and gets fewer pixels than the descriptor promised.
  const withinSource = unique.filter((w) => w <= sourceWidth);

  // Every candidate is wider than the source, so the source width is the only
  // honest descriptor available.
  return withinSource.length > 0 ? withinSource : [sourceWidth];
}
