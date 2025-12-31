import {
  useMutation,
  useQueryClient,
  UseMutationResult,
} from "@tanstack/react-query";
import { principleService } from "../../api/services";
import { Principle } from "../../types";
import { UpdatePrincipleRequest, PrincipleResponse } from "../../api/types";

/**
 * Return type for the usePrincipleMutations hook
 */
interface PrincipleMutations {
  updatePrinciple: UseMutationResult<
    PrincipleResponse,
    Error,
    { id: number; updates: UpdatePrincipleRequest },
    { previousPrinciples?: Principle[] }
  >;
}

/**
 * Mutation hooks for Principle operations
 *
 * Features:
 *   - Optimistic updates for instant UI feedback
 *   - Automatic rollback on error
 *   - Cache invalidation after successful mutations
 *
 * Usage:
 *   const { updatePrinciple } = usePrincipleMutations();
 *   updatePrinciple.mutate({
 *     id: principleId,
 *     updates: { definition: 'New definition' }
 *   });
 *
 * Triggers:
 *   - HeaderPanel field blur (definition, inclusion/exclusion criteria)
 *   - Sidebar triple-click rename (label_name)
 *
 * @returns Object containing mutation functions
 */
export const usePrincipleMutations = (): PrincipleMutations => {
  const queryClient = useQueryClient();

  /**
   * Mutation for updating principle metadata
   *
   * Optimistic Update Flow:
   *   1. onMutate: Cancel ongoing queries, snapshot current state, update cache
   *   2. API call executes in background
   *   3a. onSuccess: Replace optimistic data with server response
   *   3b. onError: Rollback to snapshot
   *
   * This provides instant UI feedback while maintaining data consistency
   */
  const updatePrinciple = useMutation<
    PrincipleResponse,
    Error,
    { id: number; updates: UpdatePrincipleRequest },
    { previousPrinciples?: Principle[] } // Context type for rollback
  >({
    mutationFn: ({ id, updates }) => principleService.update(id, updates),

    /**
     * Called immediately before mutation executes
     * Implements optimistic update pattern
     */
    onMutate: async ({ id, updates }) => {
      // Step 1: Cancel any outgoing refetches to prevent race conditions
      await queryClient.cancelQueries({ queryKey: ["principles"] });

      // Step 2: Snapshot the previous value for rollback
      const previousPrinciples = queryClient.getQueryData<Principle[]>([
        "principles",
      ]);

      // Step 3: Optimistically update the cache
      queryClient.setQueryData<Principle[]>(["principles"], (old) => {
        if (!old) return old;
        return old.map((p) =>
          p.id === id
            ? { ...p, ...updates } // Merge updates into existing principle
            : p,
        );
      });

      // Return context for rollback
      return { previousPrinciples };
    },

    /**
     * Called if mutation fails
     * Rolls back optimistic update to previous state
     */
    onError: (err, variables, context) => {
      // Restore previous state from snapshot
      if (context?.previousPrinciples) {
        queryClient.setQueryData(["principles"], context.previousPrinciples);
      }

      console.error("Failed to update principle:", err);

      // TODO: Show error toast notification
      // toast.error('Failed to save changes. Please try again.');
    },

    /**
     * Called after successful mutation
     * Replaces optimistic data with authoritative server response
     */
    onSuccess: (response) => {
      // Update cache with server response (source of truth)
      queryClient.setQueryData<Principle[]>(["principles"], (old) => {
        if (!old) return old;
        return old.map((p) =>
          p.id === response.principle.id
            ? response.principle // Replace with server data
            : p,
        );
      });

      // TODO: Show success toast notification
      // toast.success('Changes saved successfully');
    },

    /**
     * Always called after mutation (success or error)
     * Use for cleanup or refetching if needed
     */
    onSettled: () => {
      // Optionally refetch to ensure data consistency
      // queryClient.invalidateQueries({ queryKey: ['principles'] });
    },
  });

  return {
    updatePrinciple,
  };
};
