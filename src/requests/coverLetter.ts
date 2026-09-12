import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../http/clients";
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

/**
 * Start cover letter generation for a job and follow it to completion.
 *
 * The endpoint is both the trigger and the progress report: the first call claims the
 * work, later calls only read its status, so polling it is the whole protocol. Pass
 * `null` until the user asks for a letter.
 */
export function useCoverLetterGeneration(jobUid: string | null) {
  return useQuery({
    queryKey: coverLetterGenerationQueryKey(jobUid ?? ""),
    queryFn: async () => {
      const { data } =
        await apiClient.post<CoverLetterGenerationStatusResponse>(
          `/jobs/${jobUid}/cover-letter/generate`
        );
      return data;
    },
    enabled: jobUid !== null,
    refetchInterval: (query) =>
      query.state.data?.status === "pending"
        ? GENERATION_POLL_INTERVAL_MS
        : false,
    refetchOnWindowFocus: false,
    retry: false,
  });
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
