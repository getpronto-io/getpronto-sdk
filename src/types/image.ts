export type ImageFormat = "jpeg" | "jpg" | "png" | "webp" | "avif";
export type ImageFit = "cover" | "contain" | "fill" | "inside" | "outside";

export interface TransformOptions {
  w?: number; // width
  h?: number; // height
  fit?: ImageFit; // resize fit
  q?: number; // quality
  blur?: number; // blur radius
  sharp?: boolean; // sharpen
  gray?: boolean; // grayscale
  rot?: number; // rotation
  border?: string; // border width and color
  crop?: string; // crop coordinates
  format?: ImageFormat; // output format
}
