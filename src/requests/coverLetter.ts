import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { apiClient } from "../http/clients";
import { isDailyLimitError } from "../utils/apiError";
import type {
  CoverLetterContent,
  CoverLetterGenerationStatusResponse,
} from "../types/jobs";

const GENERATION_POLL_INTERVAL_MS = 3_000;

export function coverLetterQueryKey(jobUid: string) {
  return ["cover-letter", jobUid] as const;
}

export function coverLetterGenerationQueryKey(jobUid: string) {
  return ["cover-letter", "generation", jobUid] as const;
}

async function postCoverLetterGeneration(
  jobUid: string,
  force: boolean
): Promise<CoverLetterGenerationStatusResponse> {
  const { data } = await apiClient.post<CoverLetterGenerationStatusResponse>(
    `/jobs/${jobUid}/cover-letter/generate`,
    undefined,
    { params: force ? { force: true } : undefined }
  );
  return data;
}

function settleGeneration(
  queryClient: QueryClient,
  jobUid: string,
  previous: CoverLetterGenerationStatusResponse | undefined,
  next: CoverLetterGenerationStatusResponse
) {
  if (next.status !== "complete" || previous?.status === "complete") return;
  // The feed carries cover_letter_key, and a regenerated letter replaces stored content.
  void queryClient.invalidateQueries({ queryKey: ["jobs"] });
  void queryClient.resetQueries({ queryKey: coverLetterQueryKey(jobUid) });
}

function coverLetterGenerationOptions(queryClient: QueryClient, jobUid: string) {
  const queryKey = coverLetterGenerationQueryKey(jobUid);
  return queryOptions({
    queryKey,
    queryFn: async () => {
      const previous =
        queryClient.getQueryData<CoverLetterGenerationStatusResponse>(queryKey);
      // Polls never force: once a run completes, a forced poll would start another one.
      const next = await postCoverLetterGeneration(jobUid, false);
      settleGeneration(queryClient, jobUid, previous, next);
      return next;
    },
    refetchOnWindowFocus: false,
    retry: false,
  });
}

/**
 * Start cover letter generation for a job and follow it to completion.
 *
 * The endpoint is both the trigger and the progress report: the first call claims the
 * work, later calls only read its status, so polling it is the whole protocol. Pass
 * `requested` once the user asks for a letter; a regeneration seeded into the cache
 * resumes polling here without it.
 */
export function useCoverLetterGeneration(jobUid: string, requested: boolean) {
  const queryClient = useQueryClient();

  return useQuery({
    ...coverLetterGenerationOptions(queryClient, jobUid),
    enabled: (query) => requested || query.state.data?.status === "pending",
    refetchInterval: (query) => {
      if (isDailyLimitError(query.state.error)) {
        return false;
      }
      return query.state.data?.status === "pending"
        ? GENERATION_POLL_INTERVAL_MS
        : false;
    },
  });
}

/** Read a job's generation status without fetching; `useCoverLetterGeneration` polls it. */
export function useCoverLetterGenerationStatus(jobUid: string | null) {
  const queryClient = useQueryClient();
  const query = useQuery({
    ...coverLetterGenerationOptions(queryClient, jobUid ?? ""),
    enabled: false,
  });
  return jobUid === null ? undefined : query.data?.status;
}

/**
 * Ask for a new letter even though one exists. Only this request forces; it seeds the
 * generation cache with its result so `useCoverLetterGeneration` polls the run to the end.
 */
export function useRegenerateCoverLetter(jobUid: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => postCoverLetterGeneration(jobUid, true),
    onSuccess: (next) => {
      const queryKey = coverLetterGenerationQueryKey(jobUid);
      const previous =
        queryClient.getQueryData<CoverLetterGenerationStatusResponse>(queryKey);
      settleGeneration(queryClient, jobUid, previous, next);
      queryClient.setQueryData(queryKey, next);
    },
  });

  return {
    regenerate: mutation.mutate,
    isRequesting: mutation.isPending,
  };
}

export function useCoverLetter(jobUid: string | null) {
  return useQuery({
    queryKey: coverLetterQueryKey(jobUid ?? ""),
    queryFn: async () => {
      const { data } = await apiClient.get<CoverLetterContent>(
        `/jobs/${jobUid}/cover-letter`
      );
      return data;
    },
    enabled: jobUid !== null,
  });
}

export function useUpdateCoverLetter(jobUid: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (update: Partial<CoverLetterContent>) => {
      const { data } = await apiClient.patch<CoverLetterContent | undefined>(
        `/jobs/${jobUid}/cover-letter`,
        update
      );
      return data;
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.setQueryData(coverLetterQueryKey(jobUid), data);
      } else {
        queryClient.invalidateQueries({
          queryKey: coverLetterQueryKey(jobUid),
        });
      }
    },
  });
}

export async function downloadCoverLetterPdf(
  jobUid: string,
  fileName: string
): Promise<void> {
  const { data } = await apiClient.get<Blob>(
    `/jobs/${jobUid}/cover-letter-pdf`,
    { responseType: "blob" }
  );

  const url = URL.createObjectURL(data);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
