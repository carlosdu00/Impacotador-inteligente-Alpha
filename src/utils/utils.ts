import axios from 'axios';
import { ShippingRate, DeviationRange } from '../types/types';
import { EXPO_melhorEnvioToken } from "@env";

const melhorEnvioToken = EXPO_melhorEnvioToken;

let requestTimestamps: number[] = [];
const MAX_REQUESTS_PER_MINUTE = 250;
const REQUEST_THRESHOLD = 250;

export const getCurrentRequestCount = () => {
  const now = Date.now();
  requestTimestamps = requestTimestamps.filter((timestamp) => now - timestamp < 60000);
  return requestTimestamps.length;
};

export const fetchShippingRates = async (
  originCep: string,
  destinationCep: string,
  length: string,
  width: string,
  height: string,
  weight: string,
  insuranceValue: string,
  deviationRange: DeviationRange,
  costTolerance: number,
  onProgress?: (progress: number, completedRequests: number, totalRequests: number) => void
): Promise<ShippingRate[]> => {
  // Garantir que a variação 0 está sempre incluída
  const lengthDeviations = [0, ...Array.from({length: deviationRange.length.max}, (_, i) => i + 1)];
  const widthDeviations = [0, ...Array.from({length: deviationRange.width.max}, (_, i) => i + 1)];
  const heightDeviations = [0, ...Array.from({length: deviationRange.height.max}, (_, i) => i + 1)];

  const originalDimensions = {
    length: +length,
    width: +width,
    height: +height,
  };

  const dimensionVariations: {
    length: number;
    width: number;
    height: number;
    deviation: { length: number; width: number; height: number };
  }[] = [];

  for (const dLength of lengthDeviations) {
    for (const dWidth of widthDeviations) {
      for (const dHeight of heightDeviations) {
        dimensionVariations.push({
          length: Math.max(+length + dLength, 1),
          width: Math.max(+width + dWidth, 1),
          height: Math.max(+height + dHeight, 1),
          deviation: {
            length: dLength,
            width: dWidth,
            height: dHeight,
          },
        });
      }
    }
  }

  const totalRequests = dimensionVariations.length;
  let completedRequests = 0;
  const allResults: ShippingRate[] = [];

  const headers = {
    Accept: 'application/json',
    Authorization: `Bearer ${melhorEnvioToken}`,
    'Content-Type': 'application/json',
    'User-Agent': 'Aplicação',
  };

  const MAX_CONCURRENT_REQUESTS = 10;

  for (let i = 0; i < dimensionVariations.length; i += MAX_CONCURRENT_REQUESTS) {
    const chunk = dimensionVariations.slice(i, i + MAX_CONCURRENT_REQUESTS);

    const now = Date.now();
    requestTimestamps = requestTimestamps.filter((timestamp) => now - timestamp < 60000);

    if (requestTimestamps.length >= REQUEST_THRESHOLD) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      i -= MAX_CONCURRENT_REQUESTS;
      continue;
    }

    const promises = chunk.map(async (dim) => {
      const payload = {
        from: { postal_code: originCep },
        to: { postal_code: destinationCep },
        products: [
          {
            width: dim.width,
            height: dim.height,
            length: dim.length,
            weight: +weight,
            insurance_value: +insuranceValue,
            quantity: 1,
          },
        ],
        options: { receipt: false, own_hand: false, collect: false },
        services: '',
      };

      try {
        const response = await axios.post(
          'https://www.melhorenvio.com.br/api/v2/me/shipment/calculate',
          payload,
          { headers }
        );

        allResults.push(
          ...response.data.map((item: any) => {
            const totalSize = dim.length + dim.width + dim.height;
            return {
              ...item,
              deviation: dim.deviation,
              totalSize,
              originalDimensions,
            };
          })
        );
      } catch (error) {
        console.error('Erro na solicitação:', error);
      } finally {
        requestTimestamps.push(Date.now());
        completedRequests++;
        if (onProgress) {
          const progress = completedRequests / totalRequests;
          onProgress(progress, completedRequests, totalRequests);
        }
      }
    });

    await Promise.all(promises);
  }

  const availableResults = allResults.filter((item) => item.price && !item.error);
  const unavailableResults = allResults.filter((item) => !item.price || item.error);

  // Função para calcular a distribuição das variações (quanto menor, mais distribuído)
  const calculateDistribution = (deviations: number[]) => {
    const mean = deviations.reduce((sum, val) => sum + val, 0) / 3;
    return deviations.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0);
  };

  availableResults.sort((a, b) => {
    const priceA = parseFloat(a.price);
    const priceB = parseFloat(b.price);
    
    if (Math.abs(priceA - priceB) <= costTolerance) {
      if (b.totalSize !== a.totalSize) {
        return b.totalSize - a.totalSize;
      } else {
        // Desempate pela distribuição das variações
        const distA = calculateDistribution([a.deviation.length, a.deviation.width, a.deviation.height]);
        const distB = calculateDistribution([b.deviation.length, b.deviation.width, b.deviation.height]);
        return distA - distB;
      }
    } else {
      return priceA - priceB;
    }
  });

  const sortedResults = [...availableResults, ...unavailableResults];

  return sortedResults;
};