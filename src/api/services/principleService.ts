import { apiClient } from "../client";
import {
  PrinciplesResponse,
  PrincipleResponse,
  UpdatePrincipleRequest,
} from "../types";

/**
 * Service layer for Principle-related API operations
 * Provides typed methods for all principle endpoints
 */
export const principleService = {
  /**
   * Fetch all principles
   * @returns Promise resolving to all principles in the system
   * @throws AxiosError if request fails
   *
   * Endpoint: GET /api/v1/principles
   * Trigger: App component mount
   * Cache: 10 minutes (configured in query hook)
   */
  getAll: async (): Promise<PrinciplesResponse> => {
    const { data } = await apiClient.get<PrinciplesResponse>("/principles");
    return data;
  },

  /**
   * Fetch a single principle by ID
   * @param id - Unique principle identifier
   * @returns Promise resolving to principle details
   * @throws AxiosError with 404 if principle not found
   *
   * Endpoint: GET /api/v1/principles/:id
   * Trigger: Optional - Currently unused but available for detail views
   */
  getById: async (id: number): Promise<PrincipleResponse> => {
    const { data } = await apiClient.get<PrincipleResponse>(
      `/principles/${id}`,
    );
    return data;
  },

  /**
   * Update principle metadata (partial update)
   * @param id - Principle ID to update
   * @param updates - Partial principle data to update
   * @returns Promise resolving to updated principle
   * @throws AxiosError if validation fails or principle not found
   *
   * Endpoint: PATCH /api/v1/principles/:id
   * Triggers:
   *   - HeaderPanel field blur (definition, inclusion_criteria, exclusion_criteria)
   *   - Sidebar triple-click rename (label_name)
   *
   * Supports optimistic updates via TanStack Query
   */
  update: async (
    id: number,
    updates: UpdatePrincipleRequest,
  ): Promise<PrincipleResponse> => {
    const { data } = await apiClient.patch<PrincipleResponse>(
      `/principles/${id}`,
      updates,
    );
    return data;
  },

  /**
   * Delete a principle (not currently implemented in UI)
   * @param id - Principle ID to delete
   * @returns Promise resolving when deletion completes
   * @throws AxiosError if principle has associated samples
   *
   * Endpoint: DELETE /api/v1/principles/:id
   * Note: Requires backend cascade handling or sample reassignment
   */
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/principles/${id}`);
  },
};
