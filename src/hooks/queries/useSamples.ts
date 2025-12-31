import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { sampleService } from "../../api/services";
import { DataRow } from "../../types";

/**
 * Options for configuring the useSamples query
 */
interface UseSamplesOptions {
  /** Principle ID to fetch samples for */
  principleId: number;
  /** Whether to include revised samples in results (default: true) */
  showRevised: boolean;
}

/**
 * Response structure matching the SamplesResponse from API
 */
interface SamplesQueryData {
  samples: DataRow[];
  stats: {
    total: number;
    revised: number;
    percentage: number;
  };
}

/**
 * Query hook for fetching samples assigned to a specific principle
 *
 * Features:
 *   - Filtering by revision status (show/hide revised samples)
 *   - Includes revision statistics for progress tracking
 *   - Shorter cache time (2 minutes) as samples change frequently
 *   - Conditional fetching (only when principleId is valid)
 *
 * Usage:
 *   const { data, isLoading } = useSamples({
 *     principleId: selectedPrincipleId,
 *     showRevised: true
 *   });
 *   const samples = data?.samples || [];
 *   const stats = data?.stats || { total: 0, revised: 0, percentage: 0 };
 *
 * Cache Key: ['samples', principleId, showRevised]
 *   - Unique cache per principle and filter state
 *   - Toggling showRevised creates separate cache entries
 *
 * Refetch Triggers:
 *   - Principle selection change
 *   - Show/hide revised toggle
 *   - After sample mutations (via invalidation)
 *
 * @param options - Configuration object with principleId and showRevised
 * @returns UseQueryResult containing samples array and statistics
 */
export const useSamples = ({
  principleId,
  showRevised,
}: UseSamplesOptions): UseQueryResult<SamplesQueryData, Error> => {
  return useQuery<SamplesQueryData, Error>({
    queryKey: ["samples", principleId, showRevised],
    queryFn: async () => {
      // Fetch samples with filtering parameter
      const response = await sampleService.getByPrinciple(
        principleId,
        showRevised,
      );
      return {
        samples: response.samples,
        stats: response.stats,
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - samples change more frequently
    gcTime: 5 * 60 * 1000, // 5 minutes - shorter memory retention
    enabled: !!principleId && principleId > 0, // Only fetch if valid principle ID
    // Placeholder handling: Return empty state if no principle selected
    placeholderData: (previousData) => previousData, // Keep previous data during transitions
  });
};

/**
 * Query hook for fetching a single sample by ID
 * Currently unused but available for future audit/detail views
 *
 * Usage:
 *   const { data: sample } = useSample(sampleId);
 *
 * @param id - Sample ID to fetch
 * @param enabled - Whether the query should run
 * @returns UseQueryResult containing single sample
 */
export const useSample = (
  id: string,
  enabled: boolean = true,
): UseQueryResult<DataRow, Error> => {
  return useQuery<DataRow, Error>({
    queryKey: ["samples", "detail", id],
    queryFn: async () => {
      const response = await sampleService.getById(id);
      return response.sample;
    },
    enabled: enabled && !!id,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};
