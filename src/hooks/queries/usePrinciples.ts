import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { principleService } from "../../api/services";
import { Principle } from "../../types";

/**
 * Query hook for fetching all principles
 *
 * Features:
 *   - Automatic caching with 10-minute stale time
 *   - Background refetch on window focus (disabled by default in QueryClient)
 *   - Automatic retry on failure (2 attempts)
 *
 * Usage:
 *   const { data: principles, isLoading, error } = usePrinciples();
 *
 * Cache Key: ['principles']
 * Refetch Triggers:
 *   - Manual: queryClient.invalidateQueries({ queryKey: ['principles'] })
 *   - Automatic: After successful principle mutations
 *
 * @returns UseQueryResult containing principles array and loading state
 */
export const usePrinciples = (): UseQueryResult<Principle[], Error> => {
  return useQuery<Principle[], Error>({
    queryKey: ["principles"],
    queryFn: async () => {
      const response = await principleService.getAll();
      return response.principles;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - principles change infrequently
    gcTime: 15 * 60 * 1000, // 15 minutes (formerly cacheTime) - keep in memory
    // refetchOnMount: false, // Uncomment to prevent refetch on component remount
    // refetchOnWindowFocus: false, // Configured globally in QueryClient
  });
};

/**
 * Query hook for fetching a single principle by ID
 * Currently unused in the UI but available for future detail views
 *
 * Usage:
 *   const { data: principle } = usePrinciple(principleId);
 *
 * @param id - Principle ID to fetch
 * @param enabled - Whether the query should run (default: true)
 * @returns UseQueryResult containing single principle
 */
export const usePrinciple = (
  id: number,
  enabled: boolean = true,
): UseQueryResult<Principle, Error> => {
  return useQuery<Principle, Error>({
    queryKey: ["principles", id],
    queryFn: async () => {
      const response = await principleService.getById(id);
      return response.principle;
    },
    enabled: enabled && !!id, // Only run if enabled and ID exists
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
};
