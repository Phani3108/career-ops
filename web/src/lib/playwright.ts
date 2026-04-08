/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Dynamically load Playwright. Returns null if not installed.
 * Uses require() to avoid build-time module resolution errors.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadPlaywright(): Promise<any | null> {
  try {
    // Use require to avoid static analysis by the bundler
    return require(/* webpackIgnore: true */ "playwright");
  } catch {
    return null;
  }
}
