export function listingStateKey(item) {
  if (item?.id === null || item?.id === undefined || item.id === "") {
    throw new Error("Listing is missing its database id");
  }
  return `listing:${String(item.id)}`;
}
