import {
  DEFAULT_APPLIED_POSTED_WITHIN_DAYS,
  DEFAULT_HIDE_INACTIVE,
  DEFAULT_JOB_FEED_QUERY,
  SORT_FIELD_LABELS,
  type JobFeedQuery,
  type JobFeedSortField,
  type SortOrder,
} from "../types/jobs";

const STORAGE_KEY = "job_aggregator_feed_filters";

const SORT_FIELDS = new Set<string>(Object.keys(SORT_FIELD_LABELS));

export interface PersistedAppliedFilters {
  postedWithinDays: number;
  hideInactive: boolean;
}

interface PersistedFeedFilters {
  unapplied?: unknown;
  applied?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSortField(value: unknown): value is JobFeedSortField {
  return typeof value === "string" && SORT_FIELDS.has(value);
}

function isSortOrder(value: unknown): value is SortOrder {
  return value === "asc" || value === "desc";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function optionalBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function optionalFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function optionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readRaw(): PersistedFeedFilters {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed: unknown = JSON.parse(raw);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeRaw(next: PersistedFeedFilters): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function toPersistedUnapplied(query: JobFeedQuery): Record<string, unknown> {
  return {
    remote: query.remote ?? null,
    sources: query.sources,
    tags: query.tags,
    location: query.location ?? null,
    min_cv_ats_match_score: query.min_cv_ats_match_score ?? null,
    min_profile_ats_match_score: query.min_profile_ats_match_score ?? null,
    exclude_deal_breakers: query.exclude_deal_breakers,
    exclude_skipped: query.exclude_skipped,
    active_only: query.active_only,
    sort_by: query.sort_by,
    sort_order: query.sort_order,
  };
}

export function loadUnappliedQuery(): JobFeedQuery {
  const stored = readRaw().unapplied;
  if (!isRecord(stored)) {
    return { ...DEFAULT_JOB_FEED_QUERY };
  }

  return {
    ...DEFAULT_JOB_FEED_QUERY,
    remote:
      stored.remote === null ? undefined : optionalBoolean(stored.remote),
    sources: isStringArray(stored.sources)
      ? stored.sources
      : DEFAULT_JOB_FEED_QUERY.sources,
    tags: isStringArray(stored.tags) ? stored.tags : DEFAULT_JOB_FEED_QUERY.tags,
    location:
      stored.location === null ? undefined : optionalString(stored.location),
    min_cv_ats_match_score:
      stored.min_cv_ats_match_score === null
        ? undefined
        : (optionalFiniteNumber(stored.min_cv_ats_match_score) ??
          DEFAULT_JOB_FEED_QUERY.min_cv_ats_match_score),
    min_profile_ats_match_score:
      stored.min_profile_ats_match_score === null
        ? undefined
        : optionalFiniteNumber(stored.min_profile_ats_match_score),
    exclude_deal_breakers:
      optionalBoolean(stored.exclude_deal_breakers) ??
      DEFAULT_JOB_FEED_QUERY.exclude_deal_breakers,
    exclude_skipped:
      optionalBoolean(stored.exclude_skipped) ??
      DEFAULT_JOB_FEED_QUERY.exclude_skipped,
    active_only:
      optionalBoolean(stored.active_only) ?? DEFAULT_JOB_FEED_QUERY.active_only,
    sort_by: isSortField(stored.sort_by)
      ? stored.sort_by
      : DEFAULT_JOB_FEED_QUERY.sort_by,
    sort_order: isSortOrder(stored.sort_order)
      ? stored.sort_order
      : DEFAULT_JOB_FEED_QUERY.sort_order,
    applied: false,
  };
}

export function saveUnappliedQuery(query: JobFeedQuery): void {
  writeRaw({
    ...readRaw(),
    unapplied: toPersistedUnapplied(query),
  });
}

export function loadAppliedFilters(): PersistedAppliedFilters {
  const stored = readRaw().applied;
  if (!isRecord(stored)) {
    return {
      postedWithinDays: DEFAULT_APPLIED_POSTED_WITHIN_DAYS,
      hideInactive: DEFAULT_HIDE_INACTIVE,
    };
  }

  const postedWithinDays = optionalFiniteNumber(stored.postedWithinDays);
  const hideInactive = optionalBoolean(stored.hideInactive);

  return {
    postedWithinDays:
      postedWithinDays !== undefined && postedWithinDays >= 0
        ? postedWithinDays
        : DEFAULT_APPLIED_POSTED_WITHIN_DAYS,
    hideInactive: hideInactive ?? DEFAULT_HIDE_INACTIVE,
  };
}

export function saveAppliedFilters(filters: PersistedAppliedFilters): void {
  writeRaw({
    ...readRaw(),
    applied: filters,
  });
}
