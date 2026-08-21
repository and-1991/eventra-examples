import {
  tracker,
  trackFeature,
  trackPayload,
  trackPayloadOptional,
  trackPayloadElement,
  trackDestructured,
  trackDestructuredAliased,
  trackNestedDestructured,
} from "./tracker";

// 1. direct calls
tracker.track("direct_basic");
tracker.track("direct_with_userid", { userId: "u1" });
tracker?.track("direct_optional_chain");

// 2. wrapper property propagation variants
trackFeature("wrapper_plain_call");
trackPayload({ event: "wrapper_prop_plain" });
trackPayloadOptional({ event: "wrapper_prop_optional" });
trackPayloadElement({ event: "wrapper_prop_element" });
trackDestructured({ event: "wrapper_prop_destructured" });
trackDestructuredAliased({ event: "wrapper_prop_aliased" });
trackNestedDestructured({ data: { event: "wrapper_prop_nested" } });

// 3a. cast + non-null assertion on the SDK instance before .track()
const trackerCast = tracker as any;
trackerCast!.track("cast_non_null_instance_track");

// 3b. cast + non-null assertion on a wrapper reference before invoking it
const wrapperCast = trackFeature as ((n: string) => void) | undefined;
wrapperCast!("cast_non_null_wrapper_invoke");

// 4. object-literal payload directly to .track() must be IGNORED, even when cast
tracker.track({ event: "should_be_ignored_object_literal" } as any);

// 5. variables, template literals, ternaries
const EVENT_CONST = "var_event_const";
tracker.track(EVENT_CONST);
const type = "abc";
tracker.track(`template_feature_${type}`);
const flag = true;
tracker.track(flag ? "ternary_path_a" : "ternary_path_b");

// 7. ignored: non-SDK track() calls with the same method name
function track(name: string) {
  console.log(name);
}
track("legacy_should_be_ignored");

const analytics = { track: (n: string) => {} };
analytics.track("ga_should_be_ignored");

const segment = { track: (n: string) => {} };
segment.track("segment_should_be_ignored");

// 8. event name rule violations — too long (>64 chars) and disallowed characters
tracker.track(
  "this-name-is-way-too-long-to-fit-within-the-sixty-four-char-limit-1234567890"
);
tracker.track("bad chars!@#$%");
