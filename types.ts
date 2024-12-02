// types.ts

export interface ShippingRate {
  id: string;
  name: string;
  company: { name: string; picture: string };
  price: string;
  error?: string;
  deviation: { length: number; width: number; height: number };
  totalSize: number;
}
