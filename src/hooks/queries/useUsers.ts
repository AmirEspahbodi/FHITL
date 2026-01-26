import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { userService } from "../../api/services";
import { UsersResponse } from "../../api/types";

export const useNonSuperUsers = (): UseQueryResult<UsersResponse, Error> => {
  return useQuery<UsersResponse, Error>({
    queryKey: ["users", "non-superusers"],
    queryFn: async () => {
      const response = await userService.getNonSuperUsers();
      return response;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
};
