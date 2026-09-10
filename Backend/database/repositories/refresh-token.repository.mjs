import { getStore } from "../memory-store.mjs";

function cloneToken(token) {
  return { ...token };
}

export const refreshTokenRepository = {
  create(record) {
    const stored = {
      id: record.id,
      userId: record.userId,
      tokenHash: record.tokenHash,
      expiresAt: record.expiresAt,
      revokedAt: record.revokedAt ?? null,
      replacedById: record.replacedById ?? null,
      createdAt: record.createdAt ?? new Date().toISOString()
    };

    getStore().refreshTokens.set(stored.id, stored);
    return cloneToken(stored);
  },

  findByHash(tokenHash) {
    for (const token of getStore().refreshTokens.values()) {
      if (token.tokenHash === tokenHash) {
        return cloneToken(token);
      }
    }

    return null;
  },

  findById(id) {
    const token = getStore().refreshTokens.get(id);
    return token ? cloneToken(token) : null;
  },

  revoke(id, replacedById = null) {
    const token = getStore().refreshTokens.get(id);

    if (!token) {
      return null;
    }

    token.revokedAt = new Date().toISOString();
    token.replacedById = replacedById;
    return cloneToken(token);
  },

  revokeAllForUser(userId) {
    const now = new Date().toISOString();

    for (const token of getStore().refreshTokens.values()) {
      if (token.userId === userId && !token.revokedAt) {
        token.revokedAt = now;
      }
    }
  }
};
