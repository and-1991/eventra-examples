import { Eventra } from "@eventra_dev/eventra-sdk";

const tracker = new Eventra({ apiKey: "test" });
declare const someVar: string;
declare function getName(): string;

// wrapper: its own forwarding call is reported apart ("Inside a wrapper"); callers are checked on their own
function trackIt(name: string) {
  tracker.track(name);
}

trackIt("dyn_wrapper_caller_literal");
tracker.track("dyn_plain_literal");
tracker.track(process.env.DYN_EVENT_NAME!);   // reason: env
tracker.track(someVar);                        // reason: variable
tracker.track(`dyn_tpl_${someVar}`);           // reason: template
tracker.track(getName());                      // reason: call
