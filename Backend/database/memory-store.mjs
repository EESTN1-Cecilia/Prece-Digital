const store = {
  users: new Map(),
  refreshTokens: new Map(),
  auditLogs: new Map(),
  errorLogs: new Map()
};

export function getStore() {
  return store;
}

export function resetStore() {
  store.users.clear();
  store.refreshTokens.clear();
  store.auditLogs.clear();
  store.errorLogs.clear();
}
