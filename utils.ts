// utils.ts

import axios from 'axios';
import { ShippingRate } from './types';
import { EXPO_melhorEnvioToken } from "@env";

const melhorEnvioToken = EXPO_melhorEnvioToken

// Gerenciamento de requisições
let requestTimestamps: number[] = [];
const MAX_REQUESTS_PER_MINUTE = 250;
const REQUEST_THRESHOLD = 200;
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
  onProgress?: (progress: number, completedRequests: number, totalRequests: number) => void
): Promise<ShippingRate[]> => {
  const deviations = [-3, -2, -1, 0, 1, 2, 3];

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

  // Gerar todas as combinações de desvios
  for (const dLength of deviations) {
    for (const dWidth of deviations) {
      for (const dHeight of deviations) {
        dimensionVariations.push({
          length: Math.max(+length + dLength, 1), // Evitar dimensões menores que 1
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

  // Processar as solicitações em lotes para evitar sobrecarregar a API
  const MAX_CONCURRENT_REQUESTS = 10;

  for (let i = 0; i < dimensionVariations.length; i += MAX_CONCURRENT_REQUESTS) {
    const chunk = dimensionVariations.slice(i, i + MAX_CONCURRENT_REQUESTS);

    // Gerenciar o contador de requisições
    const now = Date.now();
    requestTimestamps = requestTimestamps.filter((timestamp) => now - timestamp < 60000);

    if (requestTimestamps.length >= REQUEST_THRESHOLD) {
      // Pausar até que seja seguro continuar
      await new Promise((resolve) => setTimeout(resolve, 1000));
      i -= MAX_CONCURRENT_REQUESTS; // Repetir o lote atual após a pausa
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
        // Atualizar contador de requisições
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

  // Separar resultados disponíveis e indisponíveis
  const availableResults = allResults.filter((item) => item.price && !item.error);

  const unavailableResults = allResults.filter((item) => !item.price || item.error);

  // Ordenar resultados disponíveis
  availableResults.sort((a, b) => {
    const priceA = parseFloat(a.price);
    const priceB = parseFloat(b.price);
    if (priceA !== priceB) {
      return priceA - priceB;
    } else {
      // Desempate pelo maior tamanho (soma das dimensões)
      return b.totalSize - a.totalSize;
    }
  });

  // Combinar resultados disponíveis e indisponíveis
  const sortedResults = [...availableResults, ...unavailableResults];

  return sortedResults;
};