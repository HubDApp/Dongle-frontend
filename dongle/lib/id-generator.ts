/**
 * ID Generation Utilities
 * Provides stable, collision-resistant ID generation
 * and supports mocking for tests
 */

// Allow injection for testing
let idGenerator = () => crypto.randomUUID();

/**
 * Generate a collision-resistant unique ID
 * Uses crypto.randomUUID() by default,
 * but can be mocked for test determinism
 */
export function generateId(): string {
  return idGenerator();
}

/**
 * Set a custom ID generator (for testing)
 * @param generator Custom function to generate IDs
 */
export function setIdGenerator(generator: () => string): void {
  idGenerator = generator;
}

/**
 * Reset to default crypto.randomUUID() generator
 */
export function resetIdGenerator(): void {
  idGenerator = () => crypto.randomUUID();
}
