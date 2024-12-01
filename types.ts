export interface ShippingRate {
    id: string;
    name: string;
    company: { name: string };
    price: string;
    error?: string;
    variation: string;
  }
  