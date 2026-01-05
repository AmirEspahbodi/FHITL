import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { principleService } from "../../api/services";
import { Principle } from "../../types";

export const usePrinciples = (): UseQueryResult<Principle[], Error> => {
  return useQuery<Principle[], Error>({
    queryKey: ["principles"],
    queryFn: async () => {
      const response = await principleService.getAll();
      return response.principles;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
};

export const usePrinciple = (
  id: string, // Changed from number
  enabled: boolean = true,
): UseQueryResult<Principle, Error> => {
  return useQuery<Principle, Error>({
    queryKey: ["principles", id],
    queryFn: async () => {
      const response = await principleService.getById(id);
      return response.principle;
    },
    enabled: enabled && !!id,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
};
