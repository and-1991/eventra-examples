import { useTrack } from "./hook";

export function Member() {
  const h = useTrack();
  h.viaCallback("hook_usecallback_member");
  h.viaMemo("hook_usememo_member");
}

// Known gap on 2.6.3: destructuring the hook result is not followed for these two
export function Destructured() {
  const { viaCallback, viaMemo } = useTrack();
  viaCallback("hook_usecallback_destructured");
  viaMemo("hook_usememo_destructured");
}

import { useProp, useHolder } from "./hook";
export function PropForm() {
  const p = useProp();
  p.propCallback("hook_prop_member");
  useProp().propCallback("hook_prop_chain");
  const h = useHolder();
  h.holderCallback("hook_holder_member");
}
