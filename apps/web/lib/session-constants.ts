/**
 * Shared between the Edge middleware and the Node server runtime, so it lives in its own module
 * with no imports of its own.
 */
export const SESSION_COOKIE = "rentora_session";

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
