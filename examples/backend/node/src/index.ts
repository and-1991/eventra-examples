import { trackFeature } from "./tracker";

async function main() {
  await trackFeature("node_started");
  console.log("Node app running");
}

void main();
