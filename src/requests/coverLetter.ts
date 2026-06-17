import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../http/clients";
import type { CoverLetterContent } from "../types/jobs";

export function coverLetterQueryKey(jobUid: string) {
  return ["cover-letter", jobUid] as const;
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
