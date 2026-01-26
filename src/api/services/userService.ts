import { apiClient } from "../client";
import { UsersResponse } from "../types";

export const userService = {
  getNonSuperUsers: async (
    skip: number = 0,
    limit: number = 100
  ): Promise<UsersResponse> => {
    const { data } = await apiClient.get<UsersResponse>(
      "/users/non-superusers",
      {
        params: {
          skip,
          limit,
        },
      }
    );
    return data;
  },
};
