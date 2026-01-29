// Using template because .ts needs types and anything can be passed through although I am only working on strings
export function sanitize<T>(obj: T): T {
  if (typeof obj === 'string') {
    return obj
      .trim()
      .replace(/[<>]/g, '')
      .replace(/['";]/g, '') as T;
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitize) as T;
  }
  if (obj && typeof obj === 'object') {
    const clean: Record<string, unknown> = {};
    for (const key in obj) {
      clean[key] = sanitize(obj[key]);
    }
    return clean as T;
  }
  return obj;
}