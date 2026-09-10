import inventoryService from "./inventory.service.mjs";

export function createItem({ body, user }) {
  return inventoryService.createItem(body, user);
}

export function getItem({ params }) {
  return inventoryService.getItem(params.itemId);
}

export function listItems({ url, user }) {
  const query = Object.fromEntries(url.searchParams.entries());
  return inventoryService.listItems(query, user);
}

export function updateItem({ params, body }) {
  return inventoryService.updateItem(params.itemId, body);
}

export function deleteItem({ params }) {
  return inventoryService.deleteItem(params.itemId);
}

export function createMovement({ body, user }) {
  return inventoryService.createMovement(body, user);
}

export function listMovements({ url, user }) {
  const query = Object.fromEntries(url.searchParams.entries());
  return inventoryService.listMovements(query, user);
}