export const DEMO_MANUAL_JOB_URL_HOSTS = [
  "linkedin.com",
  "arbeitnow.com",
  "indeed.com",
] as const;

export const DEMO_MANUAL_JOB_URL_REJECTED =
  "Demo job URLs must be https links to LinkedIn, Arbeitnow, or Indeed";

/**
 * Same allowlist as the API for demo `POST /jobs/submit`: https hosts on
 * LinkedIn, Arbeitnow, or Indeed (and their subdomains). Lookalikes,
 * userinfo, non-https schemes, and non-443 ports are refused.
 */
export function isAllowedDemoJobUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return false;
  }

  if (parsed.protocol !== "https:") {
    return false;
  }
  if (parsed.username || parsed.password) {
    return false;
  }

  const host = parsed.hostname.toLowerCase().replace(/\.+$/, "");
  if (!host) {
    return false;
  }
  if (parsed.port !== "" && parsed.port !== "443") {
    return false;
  }

  return DEMO_MANUAL_JOB_URL_HOSTS.some(
    (domain) => host === domain || host.endsWith(`.${domain}`),
  );
}
