// src/types/types.ts

export interface ShippingRate {
  id: string;
  name: string;
  company: { name: string; picture: string };
  price: string;
  error?: string;
  deviation: { length: number; width: number; height: number };
  totalSize: number;
  originalDimensions: { length: number; width: number; height: number };
}

export interface DeviationRange {
  length: { min: number; max: number };
  width: { min: number; max: number };
  height: { min: number; max: number };
}

export interface ShippingCalculatorParams {
  originCep: string;
  destinationCep: string;
  length: string;
  width: string;
  height: string;
  weight: string;
  insuranceValue: string;
  deviationRange: DeviationRange;
  costTolerance: number;
}