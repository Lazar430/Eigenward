const SPECIAL_URL = /^(?:[a-z][a-z\d+\-.]*:|\/\/|#|\?)/i;

/**
 * Prefixes an internal site path with Astro's configured base URL.
 *
 * Examples with base="/eigenward" and trailingSlash="always":
 *
 * withBase("")                         -> "/eigenward/"
 * withBase("/")                        -> "/eigenward/"
 * withBase("about/")                   -> "/eigenward/about/"
 * withBase("/about/")                  -> "/eigenward/about/"
 * withBase("favicon.svg")              -> "/eigenward/favicon.svg"
 * withBase("https://example.com")      -> unchanged
 * withBase("#introduction")            -> unchanged
 */
export function withBase(path = ""): string {
  if (SPECIAL_URL.test(path)) {
    return path;
  }

  const cleanPath = path.replace(/^\/+/, "");

  return cleanPath
    ? `${import.meta.env.BASE_URL}${cleanPath}`
    : import.meta.env.BASE_URL;
}
