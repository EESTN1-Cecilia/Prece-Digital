import inventoryService from "./inventory.service.mjs";

export function createMaterial({ body, user }) {
  return inventoryService.createMaterial(body, user);
}

export function getMaterial({ params, user }) {
  return inventoryService.getMaterial(params.itemId, user);
}

export function listMaterials({ url, user }) {
  const query = Object.fromEntries(url.searchParams.entries());
  return inventoryService.listMaterials(query, user);
}

export function listLowStock({ url, user }) {
  const query = Object.fromEntries(url.searchParams.entries());
  return inventoryService.listLowStock(query, user);
}

export function updateMaterial({ params, body, user }) {
  return inventoryService.updateMaterial(params.itemId, body, user);
}

export function deactivateMaterial({ params, user }) {
  return inventoryService.deactivateMaterial(params.itemId, user);
}

export function getStock({ params, user }) {
  return inventoryService.getStock(params.itemId, user);
}

export function verifyStock({ params, user }) {
  return inventoryService.verifyStock(params.itemId, user);
}

export function registerMovement({ params, body, user }) {
  return inventoryService.registerMovement(params.itemId, body, user);
}

export function registerAdjust({ params, body, user }) {
  return inventoryService.registerAdjust(params.itemId, body, user);
}

export function getMovement({ params, user }) {
  return inventoryService.getMovement(params.movementId, user);
}

export function listItemMovements({ params, url, user }) {
  const query = Object.fromEntries(url.searchParams.entries());
  return inventoryService.listItemMovements(params.itemId, query, user);
}

export function listMovements({ url, user }) {
  const query = Object.fromEntries(url.searchParams.entries());
  return inventoryService.listMovements(query, user);
}

export function getItemHistory({ params, url, user }) {
  const query = Object.fromEntries(url.searchParams.entries());
  return inventoryService.getItemHistory(params.itemId, query, user);
}