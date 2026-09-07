import type { TransformOptions } from "../types/image";

/**
 * Builds a public transform URL from a delivery URL.
 *
 * Deliberately a leaf module: it imports types only, so it can be pulled into
 * browser bundles without dragging in the HTTP client or Node's `fs`.
 *
 * The delivery route is unauthenticated and there is no URL signing, so this needs
 * no credentials and makes no network call.
 */
export function buildTransformUrl(
  baseUrl: string,
  options: TransformOptions = {}
): string {
  const url = new URL(baseUrl);

  for (const [key, value] of Object.entries(options)) {
    if (value === undefined || value === null) continue;
    url.searchParams.set(key, String(value));
  }

  return url.toString();
}
