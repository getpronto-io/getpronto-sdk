# GetPronto SDK

A JavaScript/TypeScript SDK for the GetPronto API. This SDK allows you to manage files and images on the GetPronto platform.

Full documentation can be found in [our docs area](https://www.getpronto.io/docs).

## Installation

```bash
npm install @getpronto-io/getpronto-sdk
```

## Usage

### Initializing the Client

```javascript
import GetProntoClient from "@getpronto-io/getpronto-sdk";

const client = new GetProntoClient({
  apiKey: "YOUR_API_KEY",
  baseUrl: "https://api.getpronto.io/v1", // Optional, defaults to this
});
```

### File Operations

#### Uploading Files

The SDK supports multiple file input types:

**1. Using a local file path**

```javascript
const result = await client.files.upload("./path/to/file.jpg");
```

**2. Using a remote URL**

```javascript
const result = await client.files.upload("https://example.com/image.jpg");
```

**3. Using a Buffer**

```javascript
const buffer = Buffer.from("Hello World");
const result = await client.files.upload(buffer, {
  filename: "hello.txt",
  mimeType: "text/plain"
});
```

**4. Using a Data URL**

```javascript
const dataUrl = "data:text/plain;base64,SGVsbG8gV29ybGQ=";
const result = await client.files.upload(dataUrl);
```

**5. Using a File object**

```javascript
const file = new File(["hello"], "hello.txt");
const result = await client.files.upload(file);
```


#### Custom Filename and MIME Type

You can specify a custom filename and MIME type with any upload method:

```javascript
const result = await client.files.upload(file, {
  filename: "custom-name.jpg",
  mimeType: "image/jpeg"
});
```

#### List Files

```javascript
const files = await client.files.list();

// With pagination
const page2 = await client.files.list({
  page: 2,
  pageSize: 10
});
```

#### Get File Details

```javascript
const fileDetails = await client.files.get("file-id");
```

#### Delete a File

```javascript
await client.files.delete("file-id");
```

#### Get Allowed File Types

```javascript
// Get all allowed MIME types
const mimeTypes = client.files.getAllowedMimeTypes();

// Get all allowed file extensions
const extensions = client.files.getAllowedExtensions();

// Check if a specific MIME type is allowed
const isAllowed = client.files.isAllowedMimeType("image/jpeg");
```

### Image Transformations

The SDK provides a fluent interface for transforming images. You can chain multiple transformations together and then either get a URL for the transformed image or download the transformed image directly.

#### Get a Transformed Image URL

```javascript
// Generate a URL for the transformed image
const imageUrl = await client.images
  .transform("image-id")
  .resize(800, 600)
  .grayscale()
  .quality(90)
  .toURL();

```

#### Available Transformations

The SDK supports the following image transformations:

**Resize**
```javascript
// Resize to specific dimensions (width, height, fit)
// Fit options: "cover", "contain", "fill", "inside", "outside"
.resize(800, 600, "cover")

// Resize to width only
.resize(800)

// Resize to height only
.resize(undefined, 600)
```

**Quality**
```javascript
// Set quality (1-100)
.quality(90)
```

**Blur**
```javascript
// Apply Gaussian blur (0.3-1000)
.blur(5)
```

**Sharpening**
```javascript
// Apply image sharpening
.sharpen()
```

**Grayscale**
```javascript
// Convert to grayscale
.grayscale()
```

**Rotation**
```javascript
// Rotate image by degrees (-360 to 360)
.rotate(90)
```

**Border**
```javascript
// Add a border (width in pixels, color in hex)
.border(5, "FF0000")  // 5px red border
```

**Crop**
```javascript
// Crop image (x, y, width, height)
.crop(100, 100, 500, 500)
```

**Format Conversion**
```javascript
// Convert to a specific format
.format("webp")  // Options: "jpeg", "png", "webp", "avif", etc.
```

#### Example: Multiple Transformations

```javascript
// Chain multiple transformations
const imageUrl = await client.images
  .transform("image-id")
  .resize(800, 600)
  .quality(90)
  .grayscale()
  .blur(2)
  .format("webp")
  .toURL();
```

#### Advanced: Get the Transformed Image as a Blob

In some cases, you might need the actual image data rather than just a URL. For these scenarios, use the `transform()` method:

```javascript
// Get the transformed image as a Blob
const imageBlob = await client.images
  .transform("image-id")
  .resize(800, 600)
  .grayscale()
  .transform();

// Example: Create an object URL from the blob
const objectUrl = URL.createObjectURL(imageBlob);

```

## Error Handling

The SDK uses custom error classes for better error handling:

```javascript
try {
  const result = await client.files.upload(file);
  console.log("Upload successful:", result);
} catch (error) {
  if (error.name === "APIError") {
    console.error(`API Error (${error.status}): ${error.message}`);
  } else {
    console.error("Upload error:", error);
  }
}
```

## Publishing

Publish to NPM:
- `npm login`
- Change package.json `name` field to `getpronto-sdk` 
```bash
npm publish --registry https://registry.npmjs.org/               
```

Publish to GitHub:
- `npm login --registry=https://npm.pkg.github.com`
- Change package.json `name` field to `@getpronto-io/getpronto-sdk`
```bash
npm publish --registry https://npm.pkg.github.com               
```

## License

MIT