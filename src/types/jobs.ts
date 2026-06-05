export type ApplicationStage =
  | "applied"
  | "hiring_manager_interview"
  | "technical_interview"
  | "received_offer";

export type JobFeedSortField =
  | "posted_at"
  | "cv_ats_match_score"
  | "profile_ats_match_score";

export type SortOrder = "asc" | "desc";

export interface JobPosting {
  uid: string;
  source: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  url: string;
  tags: string[];
  description_raw: string;
  job_types: string[];
  posted_at: string;
  collected_at: string;
  updated_at: string;
  company_normalized: string | null;
  title_normalized: string | null;
}

export interface FitAssessment {
  cv_ats_match_score: number;
  profile_ats_match_score: number;
  deal_breakers: string[];
  summary: string;
}

export interface JobApplicationStatus {
  username: string;
  job_uid: string;
  active: boolean;
  stage: ApplicationStage;
  skipped: boolean;
}

export interface JobFeedItem {
  job: JobPosting;
  fit: FitAssessment;
  status: JobApplicationStatus | null;
}

export interface UpdateJobStatusRequest {
  active?: boolean;
  stage?: ApplicationStage;
  skipped?: boolean;
}

export interface JobFeedQuery {
  remote?: boolean;
  sources: string[];
  tags: string[];
  location?: string;
  min_cv_ats_match_score?: number;
  min_profile_ats_match_score?: number;
  exclude_deal_breakers: boolean;
  exclude_skipped: boolean;
  application_stage?: ApplicationStage;
  active_only: boolean;
  sort_by: JobFeedSortField;
  sort_order: SortOrder;
}

export interface PaginatedDataResponse<T> {
  data: T[];
  page: number;
  page_size: number;
  total: number;
}

export interface PaginatedDataRequest<T> {
  query: T;
  page: number;
  page_size: number;
}

export type JobFeedScope = "unapplied" | "applied";

export interface JobFeedParams {
  query: JobFeedQuery;
  page: number;
  pageSize: number;
  scope: JobFeedScope;
  postedWithinDays?: number;
}

export const APPLICATION_STAGE_LABELS: Record<ApplicationStage, string> = {
  applied: "Applied",
  hiring_manager_interview: "Hiring Manager Interview",
  technical_interview: "Technical Interview",
  received_offer: "Received Offer",
};

export const DEFAULT_APPLY_STATUS: Required<
  Pick<UpdateJobStatusRequest, "active" | "stage" | "skipped">
> = {
  stage: "applied",
  active: true,
  skipped: false,
};

export const DEFAULT_SKIP_STATUS: Pick<UpdateJobStatusRequest, "skipped"> = {
  skipped: true,
};

export const SORT_FIELD_LABELS: Record<JobFeedSortField, string> = {
  posted_at: "Posted date",
  cv_ats_match_score: "CV match score",
  profile_ats_match_score: "Profile match score",
};

export const DEFAULT_JOB_FEED_QUERY: JobFeedQuery = {
  sources: [],
  tags: [],
  exclude_deal_breakers: false,
  exclude_skipped: true,
  active_only: false,
  sort_by: "profile_ats_match_score",
  sort_order: "desc",
};

export const APPLIED_JOBS_QUERY: JobFeedQuery = {
  sources: [],
  tags: [],
  exclude_deal_breakers: false,
  exclude_skipped: true,
  active_only: false,
  sort_by: "posted_at",
  sort_order: "desc",
};

export const DEFAULT_APPLIED_POSTED_WITHIN_DAYS = 30;

export const APPLIED_POSTED_WINDOW_OPTIONS = [
  { value: 30, label: "Last 30 days" },
  { value: 60, label: "Last 60 days" },
  { value: 90, label: "Last 90 days" },
  { value: 180, label: "Last 6 months" },
  { value: 365, label: "Last year" },
  { value: 0, label: "All time" },
] as const;
