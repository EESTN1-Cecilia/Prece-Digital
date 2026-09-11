const store = {
  users: new Map(),
  refreshTokens: new Map(),
  students: new Map(),
  studentsAudit: []
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