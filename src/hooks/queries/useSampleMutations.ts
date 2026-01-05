import {
  useMutation,
  useQueryClient,
  UseMutationResult,
} from "@tanstack/react-query";
import { sampleService } from "../../api/services";
import { DataRow } from "../../types";
import { SampleResponse } from "../../api/types";

interface MutationContext {
  previousData?: { samples: DataRow[]; stats: any };
  principleId?: string; // Changed from number
}

interface SampleMutations {
  updateOpinion: UseMutationResult<
    SampleResponse,
    Error,
    { id: string; opinion: string },
    MutationContext
  >;
  toggleRevision: UseMutationResult<
    SampleResponse,
    Error,
    { id: string; isRevised: boolean; reviserName: string },
    undefined
  >;
  reassignSample: UseMutationResult<
    SampleResponse,
    Error,
    { id: string; targetPrincipleId: string; reviserName: string }, // Changed targetPrincipleId to string
    undefined
  >;
}

export const useSampleMutations = (): SampleMutations => {
  const queryClient = useQueryClient();

  const updateOpinion = useMutation<
    SampleResponse,
    Error,
    { id: string; opinion: string },
    MutationContext
  >({
    mutationFn: ({ id, opinion }) => sampleService.updateOpinion(id, opinion),

    onMutate: async ({ id, opinion }) => {
      const queryCache = queryClient.getQueriesData<{
        samples: DataRow[];
        stats: any;
      }>({
        queryKey: ["samples"],
      });

      let principleId: string | null = null; // Changed from number

      for (const [key, data] of queryCache) {
        if (!data?.samples) continue;
        const sample = data.samples.find((s) => s.id === id);
        if (sample) {
          principleId = sample.principle_id;
          break;
        }
      }

      if (!principleId) {
        return {};
      }

      await queryClient.cancelQueries({
        queryKey: ["samples", principleId],
      });

      const previousData = queryClient.getQueryData<{
        samples: DataRow[];
        stats: any;
      }>(["samples", principleId, true]);

      queryClient.setQueriesData<{ samples: DataRow[]; stats: any }>(
        { queryKey: ["samples", principleId] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            samples: old.samples.map((s) =>
              s.id === id ? { ...s, expert_opinion: opinion } : s,
            ),
          };
        },
      );

      return { previousData, principleId };
    },

    onError: (err, variables, context) => {
      if (context?.principleId && context?.previousData) {
        queryClient.setQueryData(
          ["samples", context.principleId, true],
          context.previousData,
        );
      }
      console.error("Failed to update opinion:", err);
    },

    onSuccess: (response, variables, context) => {
      if (context?.principleId) {
        queryClient.invalidateQueries({
          queryKey: ["samples", context.principleId],
        });
      }
    },
  });

  const toggleRevision = useMutation<
    SampleResponse,
    Error,
    { id: string; isRevised: boolean; reviserName: string }
  >({
    mutationFn: ({ id, isRevised, reviserName }) =>
      sampleService.toggleRevision(id, isRevised, reviserName),

    onSuccess: (response) => {
      queryClient.invalidateQueries({
        queryKey: ["samples", response.sample.principle_id],
      });
    },

    onError: (err) => {
      console.error("Failed to toggle revision status:", err);
    },
  });

  const reassignSample = useMutation<
    SampleResponse,
    Error,
    { id: string; targetPrincipleId: string; reviserName: string } // Changed type
  >({
    mutationFn: ({ id, targetPrincipleId, reviserName }) =>
      sampleService.reassign(id, targetPrincipleId, reviserName),

    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["samples"],
      });
    },

    onError: (err) => {
      console.error("Failed to reassign sample:", err);
    },
  });

  return {
    updateOpinion,
    toggleRevision,
    reassignSample,
  };
};
