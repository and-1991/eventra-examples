<script setup lang="ts">
import { trackFeature } from "../tracker";

const show = true;
const items = ["a", "b"];
</script>

<template>
  <div v-if="show">
    <button event="vue_if_click" @click="trackFeature('vue_if_click')">
      Inside v-if
    </button>
  </div>

  <div v-for="item in items" :key="item">
    <button event="vue_for_click" @click="trackFeature('vue_for_click')">
      Inside v-for ({{ item }})
    </button>
  </div>

  <slot>
    <button event="vue_slot_click" @click="trackFeature('vue_slot_click')">
      Default slot content
    </button>
  </slot>

  <!-- Multiple tracked elements at the same template level -->
  <button event="vue_multi_a" @click="trackFeature('vue_multi_a')">Multi A</button>
  <button event="vue_multi_b" @click="trackFeature('vue_multi_b')">Multi B</button>
</template>
