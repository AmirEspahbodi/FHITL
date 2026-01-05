import {
  useMutation,
  useQueryClient,
  UseMutationResult,
} from "@tanstack/react-query";
import { principleService } from "../../api/services";
import { Principle } from "../../types";
import { UpdatePrincipleRequest, PrincipleResponse } from "../../api/types";

interface PrincipleMutations {
  updatePrinciple: UseMutationResult<
    PrincipleResponse,
    Error,
    { id: string; updates: UpdatePrincipleRequest }, // Changed id to string
    { previousPrinciples?: Principle[] }
  >;
}

export const usePrincipleMutations = (): PrincipleMutations => {
  const queryClient = useQueryClient();

  const updatePrinciple = useMutation<
    PrincipleResponse,
    Error,
    { id: string; updates: UpdatePrincipleRequest }, // Changed id to string
    { previousPrinciples?: Principle[] }
  >({
    mutationFn: ({ id, updates }) => principleService.update(id, updates),

    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ["principles"] });

      const previousPrinciples = queryClient.getQueryData<Principle[]>([
        "principles",
      ]);

      queryClient.setQueryData<Principle[]>(["principles"], (old) => {
        if (!old) return old;
        return old.map((p) => (p.id === id ? { ...p, ...updates } : p));
      });

      return { previousPrinciples };
    },

    onError: (err, variables, context) => {
      if (context?.previousPrinciples) {
        queryClient.setQueryData(["principles"], context.previousPrinciples);
      }
      console.error("Failed to update principle:", err);
    },

    onSuccess: (response) => {
      queryClient.setQueryData<Principle[]>(["principles"], (old) => {
        if (!old) return old;
        return old.map((p) =>
          p.id === response.principle.id ? response.principle : p,
        );
      });
    },

    onSettled: () => {},
  });

  return {
    updatePrinciple,
  };
};
