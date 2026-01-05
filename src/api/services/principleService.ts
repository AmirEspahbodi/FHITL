import { apiClient } from "../client";
import {
  PrinciplesResponse,
  PrincipleResponse,
  UpdatePrincipleRequest,
} from "../types";

export const principleService = {
  getAll: async (): Promise<PrinciplesResponse> => {
    const { data } = await apiClient.get<PrinciplesResponse>("/principles");
    return data;
  },

  getById: async (id: string): Promise<PrincipleResponse> => {
    // Changed id type
    const { data } = await apiClient.get<PrincipleResponse>(
      `/principles/${id}`,
    );
    return data;
  },

  update: async (
    id: string, // Changed id type
    updates: UpdatePrincipleRequest,
  ): Promise<PrincipleResponse> => {
    const { data } = await apiClient.patch<PrincipleResponse>(
      `/principles/${id}`,
      updates,
    );
    return data;
  },

  delete: async (id: string): Promise<void> => {
    // Changed id type
    await apiClient.delete(`/principles/${id}`);
  },
};
