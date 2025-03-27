import { HttpClient } from "../core/http-client";
import { ImageFormat, ImageFit, TransformOptions } from "../types/image";

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
      if (width < 1 || width > 5000) {
        throw new Error("Width must be between 1 and 5000 pixels");
      }
      this.options.w = width;
    }

    if (height) {
      if (height < 1 || height > 5000) {
        throw new Error("Height must be between 1 and 5000 pixels");
      }
      this.options.h = height;
    }

    if (width || height) {
      this.options.fit = fit;
    }

    return this;
  }

  /**
   * Set the output quality (1-100)
   */
  quality(value: number): this {
    if (value < 1 || value > 100) {
      throw new Error("Quality must be between 1 and 100");
    }
    this.options.q = value;
    return this;
  }

  /**
   * Apply Gaussian blur
   * @param value - Blur radius (0.3-1000)
   */
  blur(value: number): this {
    if (value < 0.3 || value > 1000) {
      throw new Error("Blur value must be between 0.3 and 1000");
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
    if (degrees < -360 || degrees > 360) {
      throw new Error("Rotation must be between -360 and 360 degrees");
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
   * Set the output format
   */
  format(type: ImageFormat): this {
    this.options.format = type;
    return this;
  }

  /**
   * Generate the transformation URL by sending the options to the server
   * @returns Promise resolving to the transformation URL
   */
  async toURL(): Promise<string> {
    const response = await this.httpClient.post<{ url: string }>(
      `/image/${this.fileId}/transform-url`,
      this.options
    );

    return response.data.url;
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
