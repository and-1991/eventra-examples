import { Eventra } from "@eventra_dev/eventra-sdk";

const tracker = new Eventra({ apiKey: "test" });

function trackFeature(name: string) {
  tracker.track(name);
}

// --- A: cast / non-null used INSIDE a wrapper body, between the sdk ref and .track() ---

function trackViaInternalCastOnly(name: string) {
  (tracker as Eventra).track(name);
}
trackViaInternalCastOnly("cast_internal_body_cast_only");

function trackViaInternalNonNullOnly(name: string) {
  tracker!.track(name);
}
trackViaInternalNonNullOnly("cast_internal_body_nonnull_only");

function trackViaInternalCastAndNonNull(name: string) {
  (tracker as Eventra)!.track(name);
}
trackViaInternalCastAndNonNull("cast_internal_body_cast_and_nonnull");

// --- B: call site casts/asserts the SDK INSTANCE itself right before .track() ---

(tracker as Eventra).track("cast_typed_instance_track");
tracker!.track("nonnull_only_instance_track");
(tracker as any).track("cast_any_instance_track");
(tracker as any)!.track("cast_any_nonnull_instance_track");

// --- C: call site casts/asserts a WRAPPER FUNCTION REFERENCE before invoking it ---

const wrapperTyped = trackFeature as (n: string) => void;
wrapperTyped("cast_typed_wrapper_invoke");

const wrapperNonNullOnly = trackFeature;
wrapperNonNullOnly!("nonnull_only_wrapper_invoke");

const wrapperAny = trackFeature as any;
wrapperAny("cast_any_wrapper_invoke");

trackFeature!("bare_nonnull_wrapper_call");
