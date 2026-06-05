import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useMemo } from "react";
import { apiClient } from "../http/clients";
import { isPostedWithinDays } from "../utils/date";
import {
  APPLIED_JOBS_QUERY,
  DEFAULT_APPLY_STATUS,
  type JobFeedItem,
  type JobFeedParams,
  type JobFeedQuery,
  type PaginatedDataResponse,
  type UpdateJobStatusRequest,
} from "../types/jobs";

const FETCH_PAGE_SIZE = 100;
const MAX_FETCH_PAGES = 50;

const APPLIED_JOBS_QUERY_KEY = ["jobs", "applied", "all"] as const;

function unappliedJobFeedQueryKey(params: JobFeedParams) {
  return [
    "jobs",
    params.scope,
    params.query,
    params.page,
    params.pageSize,
  ] as const;
}

function isAppliedItem(item: JobFeedItem): boolean {
  return item.status !== null && !item.status.skipped;
}

function isUnappliedItem(item: JobFeedItem, includeSkipped: boolean): boolean {
  if (item.status === null) {
    return true;
  }

  if (item.status.skipped) {
    return includeSkipped;
  }

  return false;
}

async function fetchAllJobFeedItems(
  query: JobFeedQuery,
): Promise<JobFeedItem[]> {
  const all: JobFeedItem[] = [];
  let page = 1;
  let serverTotal = Number.POSITIVE_INFINITY;

  while (all.length < serverTotal && page <= MAX_FETCH_PAGES) {
    const { data } = await apiClient.post<PaginatedDataResponse<JobFeedItem>>(
      "/jobs/search",
      {
        query,
        page,
        page_size: FETCH_PAGE_SIZE,
      },
    );

    all.push(...data.data);
    serverTotal = data.total;
    page += 1;

    if (data.data.length === 0) {
      break;
    }
  }

  return all;
}

export function useUnappliedJobFeed(params: JobFeedParams) {
  const includeSkipped = !params.query.exclude_skipped;

  const query = useQuery({
    queryKey: unappliedJobFeedQueryKey(params),
    queryFn: async () => {
      const { data } = await apiClient.post<
        PaginatedDataResponse<JobFeedItem>
      >("/jobs/search", {
        query: params.query,
        page: params.page,
        page_size: params.pageSize,
      });
      return data;
    },
    select: (response) => ({
      ...response,
      data: response.data.filter((item) => isUnappliedItem(item, includeSkipped)),
    }),
  });

  return {
    jobs: query.data?.data ?? [],
    total: query.data?.total ?? 0,
    page: query.data?.page ?? params.page,
    pageSize: query.data?.page_size ?? params.pageSize,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useAppliedJobFeed(
  postedWithinDays: number,
  page: number,
  pageSize: number,
) {
  const query = useQuery({
    queryKey: APPLIED_JOBS_QUERY_KEY,
    queryFn: () => fetchAllJobFeedItems(APPLIED_JOBS_QUERY),
    select: (items) => items.filter(isAppliedItem),
  });

  const filtered = useMemo(() => {
    const items = query.data ?? [];
    return items.filter((item) =>
      isPostedWithinDays(item.job.posted_at, postedWithinDays),
    );
  }, [query.data, postedWithinDays]);

  const jobs = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  return {
    jobs,
    total: filtered.length,
    page,
    pageSize,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

interface UpdateJobStatusVariables {
  jobUid: string;
  update: UpdateJobStatusRequest;
  filterContext: JobFeedParams;
}

function buildStatus(
  jobUid: string,
  existing: JobFeedItem["status"],
  update: UpdateJobStatusRequest,
): NonNullable<JobFeedItem["status"]> {
  return {
    username: existing?.username ?? "",
    job_uid: jobUid,
    active: update.active ?? existing?.active ?? DEFAULT_APPLY_STATUS.active,
    stage: update.stage ?? existing?.stage ?? DEFAULT_APPLY_STATUS.stage,
    skipped: update.skipped ?? existing?.skipped ?? DEFAULT_APPLY_STATUS.skipped,
  };
}

function applyStatusUpdate(
  items: JobFeedItem[],
  jobUid: string,
  update: UpdateJobStatusRequest,
): JobFeedItem[] {
  return items.map((item) => {
    if (item.job.uid !== jobUid) {
      return item;
    }

    if (update.skipped === false && item.status?.skipped) {
      return { ...item, status: null };
    }

    return {
      ...item,
      status: buildStatus(jobUid, item.status, update),
    };
  });
}

export function useUpdateJobStatus() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ jobUid, update }: UpdateJobStatusVariables) => {
      await apiClient.patch(`/jobs/${jobUid}/status`, update);
    },
    onMutate: async (variables) => {
      if (variables.filterContext.scope === "applied") {
        const key = APPLIED_JOBS_QUERY_KEY;
        await queryClient.cancelQueries({ queryKey: key });

        const previous = queryClient.getQueryData<JobFeedItem[]>(key);
        queryClient.setQueryData<JobFeedItem[]>(key, (current) =>
          current
            ? applyStatusUpdate(current, variables.jobUid, variables.update)
            : current,
        );

        return { key, previous, kind: "applied" as const };
      }

      const key = unappliedJobFeedQueryKey(variables.filterContext);
      await queryClient.cancelQueries({ queryKey: key });

      const previous =
        queryClient.getQueryData<PaginatedDataResponse<JobFeedItem>>(key);

      queryClient.setQueryData<PaginatedDataResponse<JobFeedItem>>(
        key,
        (current) => {
          if (!current) return current;

          return {
            ...current,
            data: applyStatusUpdate(
              current.data,
              variables.jobUid,
              variables.update,
            ),
          };
        },
      );

      return { key, previous, kind: "unapplied" as const };
    },
    onError: (_error, _variables, context) => {
      if (context) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });

  return {
    updateStatus: mutation.mutate,
    isUpdating: mutation.isPending,
  };
}
