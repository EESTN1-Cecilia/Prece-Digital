const store = {
  users: new Map(),
  refreshTokens: new Map(),
  students: new Map(),
  studentsAudit: []
  loginAttempts: new Map(),
  auditLogs: new Map(),
  errorLogs: new Map()
};

export function getStore() {
  return store;
}

export function resetStore() {
  store.users.clear();
  store.refreshTokens.clear();
  store.students.clear();
  store.studentsAudit.length = 0;
}
  store.loginAttempts.clear();
  store.auditLogs.clear();
  store.errorLogs.clear();
}
