# Image I/O Package

Server-side image processing utilities for viwo using the `sharp` library.

## Overview

Provides high-performance image operations including metadata handling, format conversion, transformations, filtering, and compositing. Used by `ImageEntity` for server-side image manipulation.

## Features

- **Metadata**: Embed and extract EXIF metadata in PNG, JPEG, WebP
- **Conversion**: Format conversion with metadata preservation
- **Transformation**: Rotate and scale images
- **Filtering**: Apply blur, sharpen, and grayscale filters
- **Compositing**: Overlay and combine multiple images

## Installation

```bash
bun add sharp
```

## Usage

```typescript
import {
  embedMetadata,
  readMetadata,
  convertImage,
  transformImage,
  filterImage,
  compositeImages,
} from "@viwo/image-io";

// Embed metadata
const withMeta = await embedMetadata(imageBuffer, "png", {
  prompt: "a beautiful landscape",
  model: "sdxl",
});

// Convert format
const jpeg = await convertImage(pngBuffer, "png", "jpeg", {
  quality: 90,
  preserveMetadata: true,
});

// Transform
const rotated = await transformImage(imageBuffer, "png", { rotation: 90, scale: 2.0 });

// Filter
const blurred = await filterImage(imageBuffer, "png", "blur");

// Composite
const combined = await compositeImages(baseBuffer, overlayBuffer, "png", { x: 100, y: 100 });
```

## Documentation

See [docs/packages/image-io.md](../../docs/packages/image-io.md) for detailed API documentation.
