import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../http/clients";
import type { CoverLetterInstructionsPayload } from "../types/users";

const COVER_LETTER_INSTRUCTIONS_PATH = "/users/cover-letter-instructions";
const COVER_LETTER_INSTRUCTIONS_QUERY_KEY = [
  "users",
  "cover-letter-instructions",
] as const;

export function useCoverLetterInstructions(enabled: boolean) {
  const query = useQuery({
    queryKey: COVER_LETTER_INSTRUCTIONS_QUERY_KEY,
    queryFn: async () => {
      const { data } = await apiClient.get<CoverLetterInstructionsPayload>(
        COVER_LETTER_INSTRUCTIONS_PATH
      );
      return data.instructions;
    },
    enabled,
  });

  return {
    instructions: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

export function useUpdateCoverLetterInstructions() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (instructions: string[]) => {
      const { data } = await apiClient.put<CoverLetterInstructionsPayload>(
        COVER_LETTER_INSTRUCTIONS_PATH,
        { instructions }
      );
      return data.instructions;
    },
    onSuccess: (instructions) => {
      queryClient.setQueryData(COVER_LETTER_INSTRUCTIONS_QUERY_KEY, instructions);
    },
  });

  return {
    saveInstructions: mutation.mutate,
    isSaving: mutation.isPending,
  };
}
