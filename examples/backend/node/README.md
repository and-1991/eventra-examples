# Eventra + Node.js

Minimal example of using Eventra SDK in a plain Node.js environment.

## Install
pnpm install

## Run
pnpm dev

## Usage
import { trackFeature } from "./tracker";

await trackFeature("node_started");

## What is shown here
- Basic SDK usage without frameworks
- Wrapper function (trackFeature)
