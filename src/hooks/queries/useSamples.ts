import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { sampleService } from "../../api/services";
import { DataRow } from "../../types";

interface UseSamplesOptions {
  principleId: string; // Changed from number
  showRevised: boolean;
}

interface SamplesQueryData {
  samples: DataRow[];
  stats: {
    total: number;
    revised: number;
    percentage: number;
  };
}

export const useSamples = ({
  principleId,
  showRevised,
}: UseSamplesOptions): UseQueryResult<SamplesQueryData, Error> => {
  return useQuery<SamplesQueryData, Error>({
    queryKey: ["samples", principleId, showRevised],
    queryFn: async () => {
      const response = await sampleService.getByPrinciple(
        principleId,
        showRevised,
      );
      return {
        samples: response.samples,
        stats: response.stats,
      };
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: !!principleId, // Removed > 0 check since it is a string now
    placeholderData: (previousData) => previousData,
  });
};

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
