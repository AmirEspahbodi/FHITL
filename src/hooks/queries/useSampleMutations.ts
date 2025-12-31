import {
  useMutation,
  useQueryClient,
  UseMutationResult,
} from "@tanstack/react-query";
import { sampleService } from "../../api/services";
import { DataRow } from "../../types";
import { SampleResponse } from "../../api/types";

/**
 * Context structure for optimistic update rollback
 */
interface MutationContext {
  previousData?: { samples: DataRow[]; stats: any };
  principleId?: number;
}

/**
 * Return type for the useSampleMutations hook
 */
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
    { id: string; targetPrincipleId: number; reviserName: string },
    undefined
  >;
}

/**
 * Mutation hooks for Sample (DataRow) operations
 *
 * Features:
 *   - Optimistic updates for opinion changes
 *   - Automatic cache invalidation for revision/reassignment
 *   - Smart cache management across multiple principle queries
 *
 * Usage:
 *   const { updateOpinion, toggleRevision, reassignSample } = useSampleMutations();
 *
 * @returns Object containing all sample mutation functions
 */
export const useSampleMutations = (): SampleMutations => {
  const queryClient = useQueryClient();

  /**
   * Mutation for updating expert opinion field
   *
   * Implements optimistic update since this is a frequent operation (debounced typing)
   * Falls back gracefully if sample can't be found in cache
   *
   * Trigger: DataRowItem textarea onChange (debounced 500ms)
   */
  const updateOpinion = useMutation<
    SampleResponse,
    Error,
    { id: string; opinion: string },
    MutationContext
  >({
    mutationFn: ({ id, opinion }) => sampleService.updateOpinion(id, opinion),

    onMutate: async ({ id, opinion }) => {
      // Find which principle this sample belongs to by scanning cache
      const queryCache = queryClient.getQueriesData<{
        samples: DataRow[];
        stats: any;
      }>({
        queryKey: ["samples"],
      });

      let principleId: number | null = null;

      // Scan all cached sample queries to find the sample
      for (const [key, data] of queryCache) {
        if (!data?.samples) continue;
        const sample = data.samples.find((s) => s.id === id);
        if (sample) {
          principleId = sample.principle_id;
          break;
        }
      }

      // If sample not in cache, skip optimistic update
      if (!principleId) {
        return {};
      }

      // Cancel ongoing queries for this principle
      await queryClient.cancelQueries({
        queryKey: ["samples", principleId],
      });

      // Snapshot current state
      const previousData = queryClient.getQueryData<{
        samples: DataRow[];
        stats: any;
      }>(["samples", principleId, true]);

      // Optimistically update ALL cache entries for this principle
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
      // Rollback on error
      if (context?.principleId && context?.previousData) {
        queryClient.setQueryData(
          ["samples", context.principleId, true],
          context.previousData,
        );
      }
      console.error("Failed to update opinion:", err);
    },

    onSuccess: (response, variables, context) => {
      // Refetch to sync with server (includes any server-side transformations)
      if (context?.principleId) {
        queryClient.invalidateQueries({
          queryKey: ["samples", context.principleId],
        });
      }
    },
  });

  /**
   * Mutation for marking samples as revised/unrevised
   *
   * No optimistic update - waits for server confirmation
   * Invalidates cache to refetch with updated statistics
   *
   * Trigger: "Set as Revised" button click in DataRowItem
   */
  const toggleRevision = useMutation<
    SampleResponse,
    Error,
    { id: string; isRevised: boolean; reviserName: string }
  >({
    mutationFn: ({ id, isRevised, reviserName }) =>
      sampleService.toggleRevision(id, isRevised, reviserName),

    onSuccess: (response) => {
      // Invalidate all queries for this principle to refetch stats
      queryClient.invalidateQueries({
        queryKey: ["samples", response.sample.principle_id],
      });

      // TODO: Show success notification
      // toast.success(`Sample marked as ${response.sample.is_revised ? 'revised' : 'pending'}`);
    },

    onError: (err) => {
      console.error("Failed to toggle revision status:", err);
      // TODO: Show error notification
      // toast.error('Failed to update revision status');
    },
  });

  /**
   * Mutation for reassigning samples to different principles
   *
   * Critical operation that affects TWO principle caches (source and target)
   * Invalidates both to ensure stats are recalculated
   *
   * Trigger: Drag-drop from DataRowItem to Sidebar principle
   */
  const reassignSample = useMutation<
    SampleResponse,
    Error,
    { id: string; targetPrincipleId: number; reviserName: string }
  >({
    mutationFn: ({ id, targetPrincipleId, reviserName }) =>
      sampleService.reassign(id, targetPrincipleId, reviserName),

    onSuccess: (response, variables) => {
      // Invalidate ALL sample queries to refetch both source and target principles
      // This ensures stats are recalculated for both
      queryClient.invalidateQueries({
        queryKey: ["samples"],
      });

      // TODO: Show success notification with undo option
      // toast.success('Sample reassigned successfully');
    },

    onError: (err) => {
      console.error("Failed to reassign sample:", err);
      // TODO: Show error notification
      // toast.error('Failed to reassign sample. Please try again.');
    },
  });

  return {
    updateOpinion,
    toggleRevision,
    reassignSample,
  };
};
