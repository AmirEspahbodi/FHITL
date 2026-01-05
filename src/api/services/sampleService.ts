import { apiClient } from "../client";
import {
  SamplesResponse,
  SampleResponse,
  UpdateSampleOpinionRequest,
  ToggleSampleRevisionRequest,
  ReassignSampleRequest,
} from "../types";

export const sampleService = {
  getByPrinciple: async (
    principleId: string, // Changed from number
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

  reassign: async (
    id: string,
    targetPrincipleId: string, // Changed from number
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

  getById: async (id: string): Promise<SampleResponse> => {
    const { data } = await apiClient.get<SampleResponse>(`/samples/${id}`);
    return data;
  },
};
