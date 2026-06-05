export function normalizeHomeUrl(raw: string | undefined): {
  base: string;
  basename: string | undefined;
} {
  const value = raw?.trim() || "/";

  if (value === "/" || value === "") {
    return { base: "/", basename: undefined };
  }

  const withLeading = value.startsWith("/") ? value : `/${value}`;
  const pathname = withLeading.replace(/\/$/, "");

  return { base: `${pathname}/`, basename: pathname };
}

export function getRouterBasename(): string | undefined {
  return normalizeHomeUrl(import.meta.env.VITE_HOME_URL).basename;
}
