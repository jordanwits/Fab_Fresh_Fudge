/**
 * Errors an adapter can throw that the UI shows verbatim.
 *
 * Lives in its own module so adapters can import it without creating a cycle
 * back through adapter.js, which imports the adapters.
 */

/** Sign-in failed for a reason the user can act on: bad password, locked, etc. */
export class AuthError extends Error {
  constructor(message) {
    super(message)
    this.name = 'AuthError'
  }
}

/** A write failed for a reason the user can act on: duplicate id, over quota. */
export class DataError extends Error {
  constructor(message) {
    super(message)
    this.name = 'DataError'
  }
}
