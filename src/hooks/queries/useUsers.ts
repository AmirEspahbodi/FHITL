import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
} from "@tanstack/react-query";
import { userService } from "../../api/services";
import { UsersResponse, CreateUserRequest, User } from "../../api/types";
import { EnhancedApiError } from "../../api/client";

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

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation<User, EnhancedApiError, CreateUserRequest>({
    mutationFn: (newUser) => userService.createUser(newUser),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", "non-superusers"] });
    },
  });
};
