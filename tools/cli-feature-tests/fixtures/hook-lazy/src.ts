import { Eventra } from "@eventra_dev/eventra-sdk";

const tracker = new Eventra({ apiKey: "test" });

// hook returning a bare function
export function useTracker() {
  return (name: string) => tracker.track(name);
}
const track = useTracker();
track("hook_bare_fn_var");
useTracker()("hook_bare_fn_inline");

// cached lazy getter, `any`-typed
let lazy: any;
export async function getLazy() {
  if (!lazy) {
    const { Eventra: E } = await import("@eventra_dev/eventra-sdk");
    lazy = new E({ apiKey: "test" });
  }
  return lazy;
}
export async function lazyTrack(name: string) {
  (await getLazy()).track(name);
}
lazyTrack("lazy_cached_getter");
