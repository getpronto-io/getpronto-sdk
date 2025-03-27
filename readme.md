# GetPronto SDK

A JavaScript/TypeScript SDK for the GetPronto API. This SDK allows you to manage files and images on the GetPronto platform.

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

**1. Using a File object**

```javascript
// Browser environment
const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];
const result = await client.files.upload(file);
```

**2. Using a local file path** (Node.js only)

```javascript
// Node.js environment
const result = await client.files.upload("./path/to/file.jpg");
```

**3. Using a remote URL**

```javascript
const result = await client.files.upload("https://example.com/image.jpg");
```

**4. Using a Buffer** (Node.js)

```javascript
const buffer = Buffer.from("Hello World");
const result = await client.files.upload(buffer, {
  filename: "hello.txt",
  mimeType: "text/plain"
});
```

**5. Using a Data URL**

```javascript
const dataUrl = "data:text/plain;base64,SGVsbG8gV29ybGQ=";
const result = await client.files.upload(dataUrl);
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

## License

MIT