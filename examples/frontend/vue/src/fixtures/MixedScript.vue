<script lang="ts">
export default {
  name: "MixedScript",
};
</script>

<script setup lang="ts">
import { trackFeature } from "../tracker";

function handleClick() {
  trackFeature("vue_mixed_script_click");
}
</script>

<template>
  <button event="vue_mixed_template_click" @click="handleClick">
    Mixed script + script setup
  </button>
</template>
