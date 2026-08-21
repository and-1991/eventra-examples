<script setup lang="ts">
import { onMounted } from "vue";

// No explicit import of trackFeature — it lives in utils/tracker.ts, which
// Nuxt auto-imports project-wide. This page exists specifically to test
// whether eventra-cli (via cli-plugin-vue) can resolve this auto-imported
// wrapper call once .nuxt/imports.d.ts is generated and wired into tsconfig.
onMounted(() => {
  trackFeature("nuxt_auto_import_click");
});
</script>

<template>
  <main style="padding: 40px">
    <h1>Nuxt Eventra — auto-import</h1>
  </main>
</template>
