import { apiClient } from "../client";
import { UsersResponse, CreateUserRequest, User } from "../types";

export const userService = {
  getNonSuperUsers: async (
    skip: number = 0,
    limit: number = 100,
  ): Promise<UsersResponse> => {
    const { data } = await apiClient.get<UsersResponse>(
      "/users/non-superusers",
      {
        params: {
          skip,
          limit,
        },
      },
    );
    return data;
  },

  getUserDataset: async (userId: string): Promise<Blob> => {
    const { data } = await apiClient.get<Blob>(`/users/${userId}/get-dataset`, {
      responseType: "blob", // Critical for file downloads
      headers: {
        Accept: "application/json",
      },
    });
    return data;
  },

  createUser: async (user: CreateUserRequest): Promise<User> => {
    const { data } = await apiClient.post<User>("/users/", user);
    return data;
  },
};
