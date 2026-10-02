import { isAxiosError } from "axios";

export function isDailyLimitError(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 429;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!isAxiosError(error)) {
    return fallback;
  }

  const detail = (error.response?.data as { detail?: unknown } | undefined)
    ?.detail;
  if (typeof detail === "string" && detail.trim().length > 0) {
    return detail;
  }

  if (Array.isArray(detail)) {
    const messages = detail.flatMap((item) =>
      item &&
      typeof item === "object" &&
      "msg" in item &&
      typeof item.msg === "string"
        ? [item.msg]
        : []
    );
    if (messages.length > 0) {
      return messages.join("; ");
    }
  }

  return fallback;
}
