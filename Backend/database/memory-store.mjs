const store = {
  users: new Map(),
  refreshTokens: new Map()
};

export function getStore() {
  return store;
}

export function resetStore() {
  store.users.clear();
  store.refreshTokens.clear();
}
