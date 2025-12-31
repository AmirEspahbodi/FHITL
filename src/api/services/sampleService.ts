import { apiClient } from "../client";
import {
  SamplesResponse,
  SampleResponse,
  UpdateSampleOpinionRequest,
  ToggleSampleRevisionRequest,
  ReassignSampleRequest,
} from "../types";

/**
 * Service layer for Sample (DataRow) related API operations
 * Handles all CRUD operations for annotation samples
 */
export const sampleService = {
  /**
   * Fetch samples for a specific principle with optional filtering
   * @param principleId - The principle ID to fetch samples for
   * @param showRevised - Whether to include revised samples (default: true)
   * @returns Promise resolving to samples array and revision statistics
   * @throws AxiosError if principle not found
   *
   * Endpoint: GET /api/v1/principles/:principleId/samples?show_revised={boolean}
   * Triggers:
   *   - Principle selection in Sidebar
   *   - Toggle "Show/Hide Revised" button
   *
   * Response includes:
   *   - samples: Array of DataRow objects
   *   - stats: { total, revised, percentage } for progress tracking
   */
  getByPrinciple: async (
    principleId: number,
    showRevised: boolean = true,
  ): Promise<SamplesResponse> => {
    const { data } = await apiClient.get<SamplesResponse>(
      `/principles/${principleId}/samples`,
      {
        params: { show_revised: showRevised },
      },
    );
    return data;
  },

  /**
   * Update the expert opinion field for a sample
   * @param id - Sample ID (string UUID)
   * @param opinion - New expert opinion text
   * @returns Promise resolving to updated sample
   * @throws AxiosError if sample not found
   *
   * Endpoint: PATCH /api/v1/samples/:id/opinion
   * Trigger: DataRowItem textarea blur (with 500ms debounce)
   *
   * Note: This operation should NOT auto-mark as revised
   *       Revision marking is explicit via toggleRevision()
   */
  updateOpinion: async (
    id: string,
    opinion: string,
  ): Promise<SampleResponse> => {
    const payload: UpdateSampleOpinionRequest = { expert_opinion: opinion };
    const { data } = await apiClient.patch<SampleResponse>(
      `/samples/${id}/opinion`,
      payload,
    );
    return data;
  },

  /**
   * Mark a sample as revised or unrevised
   * @param id - Sample ID
   * @param isRevised - Target revision state
   * @param reviserName - Name of user performing the revision
   * @returns Promise resolving to updated sample
   * @throws AxiosError if sample not found
   *
   * Endpoint: PATCH /api/v1/samples/:id/revision
   * Trigger: "Set as Revised" button click in DataRowItem
   *
   * Backend should:
   *   - Set is_revised flag
   *   - Set reviser_name if revised=true, null if false
   *   - Set revision_timestamp to current time if revised=true
   *   - Recalculate principle revision statistics
   */
  toggleRevision: async (
    id: string,
    isRevised: boolean,
    reviserName: string,
  ): Promise<SampleResponse> => {
    const payload: ToggleSampleRevisionRequest = {
      is_revised: isRevised,
      reviser_name: reviserName,
    };
    const { data } = await apiClient.patch<SampleResponse>(
      `/samples/${id}/revision`,
      payload,
    );
    return data;
  },

  /**
   * Reassign a sample to a different principle
   * @param id - Sample ID to reassign
   * @param targetPrincipleId - New principle ID
   * @param reviserName - Name of user performing reassignment
   * @returns Promise resolving to updated sample
   * @throws AxiosError if sample or target principle not found
   *
   * Endpoint: PATCH /api/v1/samples/:id/reassign
   * Trigger: Drag-drop from DataRowItem to Sidebar principle
   *
   * Backend should:
   *   - Update principle_id to target
   *   - Automatically mark as revised (is_revised = true)
   *   - Set reviser_name and revision_timestamp
   *   - Recalculate stats for BOTH source and target principles
   *
   * Frontend invalidates queries for both principles to refetch stats
   */
  reassign: async (
    id: string,
    targetPrincipleId: number,
    reviserName: string,
  ): Promise<SampleResponse> => {
    const payload: ReassignSampleRequest = {
      target_principle_id: targetPrincipleId,
      reviser_name: reviserName,
    };
    const { data } = await apiClient.patch<SampleResponse>(
      `/samples/${id}/reassign`,
      payload,
    );
    return data;
  },

  /**
   * Fetch a single sample by ID (not currently used in UI)
   * @param id - Sample ID
   * @returns Promise resolving to sample details
   * @throws AxiosError with 404 if not found
   *
   * Endpoint: GET /api/v1/samples/:id
   * Future use: Detail views, audit logs, direct links
   */
  getById: async (id: string): Promise<SampleResponse> => {
    const { data } = await apiClient.get<SampleResponse>(`/samples/${id}`);
    return data;
  },
};
