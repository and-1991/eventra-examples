<script setup lang="ts">
import { trackFeature } from "../tracker";

// Resolvable dynamic template attribute: :event points at a script-level const,
// so cli-plugin-vue should resolve it down to the literal "vue_dynamic_resolved".
const RESOLVED_EVENT = "vue_dynamic_resolved";

// Unresolvable dynamic template attribute: :event points at a prop, whose value
// only exists at runtime — cli-plugin-vue should report this as a dynamic
// occurrence instead of silently dropping it or crashing.
defineProps<{ unresolvedEvent: string }>();

function handleResolvedClick() {
  trackFeature(RESOLVED_EVENT);
}
</script>

<template>
  <button :event="RESOLVED_EVENT" @click="handleResolvedClick">
    Resolved dynamic event
  </button>
  <button :event="unresolvedEvent" @click="trackFeature(unresolvedEvent)">
    Unresolved dynamic event (prop-driven)
  </button>
</template>
