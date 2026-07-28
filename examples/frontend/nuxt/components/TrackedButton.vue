<script setup lang="ts">
import { trackFeature } from "../utils/tracker";

const props = defineProps<{ event: string }>();

function handleClick() {
  trackFeature(props.event);
}
</script>

<template>
  <button @click="handleClick">
    <slot />
  </button>
</template>
