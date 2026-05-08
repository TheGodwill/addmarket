// Prevents XSS via premature </script> tag closure inside JSON-LD blocks.
// JSON.stringify does not escape </, so a value containing "</script>"
// would let the browser's HTML parser close the script tag early.
// Replacing </ with <\/ is semantically identical in JSON but safe in HTML.
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/<\//g, '<\\/')
}
