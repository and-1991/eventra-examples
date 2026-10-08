// An in-house logger: not covered by a preset, so eventra.json declares a custom rule
// { "callee": "audit.log", "nameArg": 1 }
export const audit = {
  log(userId: string, action: string) {
    console.log("audit", userId, action);
  },
};

export function auditExport(userId: string) {
  audit.log(userId, "segment_audit_export");
}
