export function getRandomItem<T>(items: T[]): T | null {
  if (items.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * items.length);
  return items[randomIndex];
}
