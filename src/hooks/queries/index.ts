/**
 * Centralized export of all TanStack Query hooks
 * Provides clean imports throughout the application
 *
 * Usage:
 *   import {
 *     usePrinciples,
 *     useSamples,
 *     usePrincipleMutations,
 *     useSampleMutations
 *   } from '@/hooks/queries';
 */

// Query hooks (data fetching)
export * from "./usePrinciples";
export * from "./useSamples";

// Mutation hooks (data modification)
export * from "./usePrincipleMutations";
export * from "./useSampleMutations";
