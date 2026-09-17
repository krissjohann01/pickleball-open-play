/**
 * Generates a unique-enough id for players/food-orders — not cryptographically
 * random, just unique within this app. Deliberately doesn't use
 * crypto.randomUUID(): that requires a "secure context" (HTTPS, or the
 * localhost exception) in browsers, which a plain-HTTP deployment (e.g. an
 * EC2 box reached by IP) isn't — it silently throws there.
 */
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
