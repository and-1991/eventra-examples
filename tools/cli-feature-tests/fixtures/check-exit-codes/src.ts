import { Eventra } from "@eventra_dev/eventra-sdk";

const tracker = new Eventra({ apiKey: "test" });

tracker.track("check_exit_event_one");
