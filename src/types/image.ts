/** Formats the API can encode to. Anything else is rejected server-side. */
export const IMAGE_FORMATS = [
  "jpeg",
  "png",
  "webp",
  "avif",
  "gif",
  "tiff",
] as const;
export type ImageFormat = (typeof IMAGE_FORMATS)[number];

export const IMAGE_FITS = [
  "cover",
  "contain",
  "fill",
  "inside",
  "outside",
] as const;
export type ImageFit = (typeof IMAGE_FITS)[number];

/** Lets the API pick the output format. */
export type ImageFormatAuto = "auto";
/** Lets the API pick a compression level for the image. */
export type ImageQualityAuto = "auto";

/** Mirrors the API's accepted ranges, so bad values fail before a request. */
export const TRANSFORM_BOUNDS = {
  w: { min: 1, max: 5000 },
  h: { min: 1, max: 5000 },
  q: { min: 1, max: 100 },
  blur: { min: 0.3, max: 1000 },
  rot: { min: -360, max: 360 },
};

export interface TransformOptions {
  w?: number; // width
  h?: number; // height
  fit?: ImageFit; // resize fit
  q?: number | ImageQualityAuto; // quality
  blur?: number; // blur radius
  sharp?: boolean; // sharpen
  gray?: boolean; // grayscale
  rot?: number; // rotation
  border?: string; // border width and color
  crop?: string; // crop coordinates
  format?: ImageFormat | ImageFormatAuto; // output format
}

export interface ImagePropsOptions extends Omit<TransformOptions, "w" | "h"> {
  /** Candidate widths for srcset. Clamped to the source width when it is known. */
  widths?: number[];
  /** The `sizes` attribute. Describes display size, which markup cannot infer. */
  sizes?: string;
}

export interface ImageProps {
  src: string;
  srcSet: string;
  sizes?: string;
  width?: number;
  height?: number;
}
