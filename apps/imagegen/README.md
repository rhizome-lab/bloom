# Image Generation Frontend

A comprehensive image generation frontend for viwo, combining Layer Mode (InvokeAI-style canvas) with Blocks Mode (visual script editor).

## Overview

This application provides a dual-interface system for AI image generation:

- **Layer Mode**: Visual canvas interface for drawing, compositing, and generating images with support for ControlNet, inpainting, and entity integration
- **Blocks Mode**: Visual script editor that auto-generates blocks from server capabilities

## Quick Start

Start the development server:

```bash
cd apps/imagegen
bun dev
```

The app will be available at `http://localhost:3002`.

**Prerequisites:**

- Viwo server running on `ws://localhost:8080`
- Diffusers plugin server for image generation (optional, see [docs](../../docs/plugins/diffusers.md))

## Contents

- **src/App.tsx**: Root component with mode toggle and template management
- **src/modes/LayerMode.tsx**: Canvas-based image generation interface
- **src/modes/BlocksMode.tsx**: Visual script editor wrapper
- **src/engine/canvas**: Canvas system with ViwoScript integration
- **src/utils**: Utilities for generation, templates, and entity management

## Documentation

See [docs/apps/imagegen.md](../../docs/apps/imagegen.md) for detailed documentation.
