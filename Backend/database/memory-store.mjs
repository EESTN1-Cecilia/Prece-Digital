const store = {
  users: new Map(),
  refreshTokens: new Map(),
  students: new Map(),
  studentsAudit: [],
  loginAttempts: new Map(),
  auditLogs: new Map(),
  errorLogs: new Map(),
  rolePermissions: new Map()
};

export function getStore() {
  return store;
}

export function resetStore() {
  for (const value of Object.values(store)) {
    if (value instanceof Map || value instanceof Set) {
      value.clear();
    } else if (Array.isArray(value)) {
      value.length = 0;
    }
  }
}

