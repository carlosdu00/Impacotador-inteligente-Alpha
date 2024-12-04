// types.ts

export interface ShippingRate {
  id: string;
  name: string;
  company: { name: string; picture: string };
  price: string;
  error?: string;
  deviation: { length: number; width: number; height: number };
  totalSize: number;
  originalDimensions: { length: number; width: number; height: number }; // Adicione esta linha
}
