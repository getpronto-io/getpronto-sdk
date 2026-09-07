import { HttpClient } from "../core/http-client";
import { buildTransformUrl } from "../core/build-transform-url";
import { FileMetadata } from "../types/file";
import {
  IMAGE_FORMATS,
  ImageFormat,
  ImageFormatAuto,
  ImageFit,
  ImageQualityAuto,
  TRANSFORM_BOUNDS,
  TransformOptions,
} from "../types/image";

export class ImageTransformer {
  private options: TransformOptions = {};
  private fileId: string;

  constructor(fileId: string, private httpClient: HttpClient) {
    this.fileId = fileId;
  }

  /**
   * Set the width and/or height for resizing
   * @param width - Target width in pixels
   * @param height - Target height in pixels
   * @param fit - How the image should fit these dimensions
   */
  resize(width?: number, height?: number, fit: ImageFit = "cover"): this {
    if (width) {
      if (width < TRANSFORM_BOUNDS.w.min || width > TRANSFORM_BOUNDS.w.max) {
        throw new Error(
          `Width must be between ${TRANSFORM_BOUNDS.w.min} and ${TRANSFORM_BOUNDS.w.max} pixels`
        );
      }
      this.options.w = width;
    }

    if (height) {
      if (height < TRANSFORM_BOUNDS.h.min || height > TRANSFORM_BOUNDS.h.max) {
        throw new Error(
          `Height must be between ${TRANSFORM_BOUNDS.h.min} and ${TRANSFORM_BOUNDS.h.max} pixels`
        );
      }
      this.options.h = height;
    }

    if (width || height) {
      this.options.fit = fit;
    }

    return this;
  }

  /**
   * Set the output quality (1-100), or "auto" to let the API choose per image
   */
  quality(value: number | ImageQualityAuto): this {
    if (
      value !== "auto" &&
      (value < TRANSFORM_BOUNDS.q.min || value > TRANSFORM_BOUNDS.q.max)
    ) {
      throw new Error(
        `Quality must be between ${TRANSFORM_BOUNDS.q.min} and ${TRANSFORM_BOUNDS.q.max}, or "auto"`
      );
    }
    this.options.q = value;
    return this;
  }

  /**
   * Apply Gaussian blur
   * @param value - Blur radius (0.3-1000)
   */
  blur(value: number): this {
    if (value < TRANSFORM_BOUNDS.blur.min || value > TRANSFORM_BOUNDS.blur.max) {
      throw new Error(
        `Blur value must be between ${TRANSFORM_BOUNDS.blur.min} and ${TRANSFORM_BOUNDS.blur.max}`
      );
    }
    this.options.blur = value;
    return this;
  }

  /**
   * Apply sharpening to the image
   */
  sharpen(): this {
    this.options.sharp = true;
    return this;
  }

  /**
   * Convert image to grayscale
   */
  grayscale(): this {
    this.options.gray = true;
    return this;
  }

  /**
   * Rotate the image
   * @param degrees - Rotation angle (-360 to 360)
   */
  rotate(degrees: number): this {
    if (
      degrees < TRANSFORM_BOUNDS.rot.min ||
      degrees > TRANSFORM_BOUNDS.rot.max
    ) {
      throw new Error(
        `Rotation must be between ${TRANSFORM_BOUNDS.rot.min} and ${TRANSFORM_BOUNDS.rot.max} degrees`
      );
    }
    this.options.rot = degrees;
    return this;
  }

  /**
   * Add a border to the image
   * @param width - Border width in pixels
   * @param color - Border color in hex format (without #)
   */
  border(width: number, color: string): this {
    if (width < 1) {
      throw new Error("Border width must be positive");
    }

    const hexColor = color.replace("#", "");
    if (!/^[0-9A-F]{6}$/i.test(hexColor)) {
      throw new Error(
        "Invalid color format. Use 6-digit hex color (e.g., FF0000 for red)"
      );
    }

    this.options.border = `${width}_${hexColor}`;
    return this;
  }

  /**
   * Crop the image
   * @param x - Starting x coordinate
   * @param y - Starting y coordinate
   * @param width - Crop width
   * @param height - Crop height
   */
  crop(x: number, y: number, width: number, height: number): this {
    if (width < 1 || height < 1) {
      throw new Error("Crop dimensions must be positive");
    }
    this.options.crop = `${x},${y},${width},${height}`;
    return this;
  }

  /**
   * Set the output format, or "auto" to let the API choose
   */
  format(type: ImageFormat | ImageFormatAuto): this {
    if (type !== "auto" && !IMAGE_FORMATS.includes(type)) {
      throw new Error(
        `Format must be one of ${IMAGE_FORMATS.join(", ")}, or "auto"`
      );
    }
    this.options.format = type;
    return this;
  }

  /**
   * Generate the transformation URL.
   *
   * Resolves the file's delivery URL, then builds the transform URL with the same
   * serialiser `imageProps` uses, so there is one definition of how options become
   * a query string. The round trip is only to turn a file id into a URL — nothing
   * about the options needs the server.
   *
   * @returns Promise resolving to the transformation URL
   */
  async toURL(): Promise<string> {
    const response = await this.httpClient.get<{ file: FileMetadata }>(
      `/files/${this.fileId}`
    );

    return buildTransformUrl(response.data.file.secureUrl, this.options);
  }

  /**
   * Execute the transformation and get the transformed image data
   */
  async transform(): Promise<Blob> {
    const transformedUrl = await this.toURL();

    const response = await fetch(transformedUrl, {
      headers: {
        Accept: "image/*",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Image transformation failed: ${response.status} ${response.statusText}`
      );
    }

    return await response.blob();
  }
}
