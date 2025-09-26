// src/utils/utils.ts
import axios from 'axios';
import { ShippingRate, DeviationRange } from '../types/types';
import { EXPO_melhorEnvioToken } from '@env';

const melhorEnvioToken = EXPO_melhorEnvioToken || '';

let requestTimestamps: number[] = [];
const REQUESTS_WINDOW_MS = 60_000; // 1 minuto
const MAX_REQUESTS_PER_MINUTE = 250; // ajuste conforme sua cota real
const MAX_CONCURRENT_REQUESTS = 10; // controlar concorrência localmente

export const getCurrentRequestCount = () => {
  const now = Date.now();
  requestTimestamps = requestTimestamps.filter((t) => now - t < REQUESTS_WINDOW_MS);
  return requestTimestamps.length;
};

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

/**
 * Gera um array com os valores entre min e max inclusive (assume min >= 0)
 * Ex: rangeToArray(0, 2) => [0, 1, 2]
 */
const rangeToArray = (min: number, max: number) => {
  const arr: number[] = [];
  for (let i = min; i <= max; i++) arr.push(i);
  return arr;
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
  // Parse numbers
  const originalDimensions = {
    length: Number(length),
    width: Number(width),
    height: Number(height),
  };

  // Garantir que min não seja negativo (o projeto não usa variações negativas)
  const lengthMin = Math.max(0, deviationRange.length.min);
  const widthMin = Math.max(0, deviationRange.width.min);
  const heightMin = Math.max(0, deviationRange.height.min);

  const lengthDeviations = rangeToArray(lengthMin, Math.max(lengthMin, deviationRange.length.max));
  const widthDeviations = rangeToArray(widthMin, Math.max(widthMin, deviationRange.width.max));
  const heightDeviations = rangeToArray(heightMin, Math.max(heightMin, deviationRange.height.max));

  // Garantir que 0 esteja presente (opção sem alteração)
  if (!lengthDeviations.includes(0)) lengthDeviations.unshift(0);
  if (!widthDeviations.includes(0)) widthDeviations.unshift(0);
  if (!heightDeviations.includes(0)) heightDeviations.unshift(0);

  const dimensionVariations: {
    length: number;
    width: number;
    height: number;
    deviation: { length: number; width: number; height: number };
  }[] = [];

  for (const dL of lengthDeviations) {
    for (const dW of widthDeviations) {
      for (const dH of heightDeviations) {
        const newL = Math.max(originalDimensions.length + dL, 1);
        const newW = Math.max(originalDimensions.width + dW, 1);
        const newH = Math.max(originalDimensions.height + dH, 1);

        dimensionVariations.push({
          length: newL,
          width: newW,
          height: newH,
          deviation: { length: dL, width: dW, height: dH },
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
  };

  // Função para calcular a distribuição das variações (menor = mais "uniforme")
  const calculateDistribution = (deviations: number[]) => {
    const mean = deviations.reduce((s, v) => s + v, 0) / deviations.length;
    return deviations.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0);
  };

  // Executa em chunks controlando concorrência e throttle por minuto
  for (let i = 0; i < dimensionVariations.length; i += MAX_CONCURRENT_REQUESTS) {
    // Verificar limite de requisições por minuto
    const now = Date.now();
    requestTimestamps = requestTimestamps.filter((t) => now - t < REQUESTS_WINDOW_MS);

    if (requestTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
      // espera um segundo e recheca
      await sleep(1000);
      i -= MAX_CONCURRENT_REQUESTS; // volta o bloco para tentar de novo
      continue;
    }

    const chunk = dimensionVariations.slice(i, i + MAX_CONCURRENT_REQUESTS);

    const promises = chunk.map(async (dim) => {
      const payload = {
        from: { postal_code: originCep },
        to: { postal_code: destinationCep },
        products: [
          {
            width: dim.width,
            height: dim.height,
            length: dim.length,
            weight: Number(weight),
            insurance_value: Number(insuranceValue),
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
          { headers, timeout: 20_000 }
        );

        // Normalizar resposta para array
        let items: any[] = [];
        if (Array.isArray(response.data)) {
          items = response.data;
        } else if (Array.isArray(response.data.services)) {
          items = response.data.services;
        } else if (Array.isArray(response.data.data)) {
          items = response.data.data;
        } else if (response.data && typeof response.data === 'object') {
          items = [response.data];
        }

        allResults.push(
          ...items.map((item: any) => {
            const originalVolume =
              originalDimensions.length * originalDimensions.width * originalDimensions.height;
            const newVolume =
              (originalDimensions.length + dim.deviation.length) *
              (originalDimensions.width + dim.deviation.width) *
              (originalDimensions.height + dim.deviation.height);
            const volumeGain = originalVolume > 0 ? ((newVolume - originalVolume) / originalVolume) * 100 : 0;

            const priceStr = item.price !== undefined && item.price !== null ? String(item.price) : '';

            return {
              id: item.id ?? `${item.service_id ?? item.name ?? Math.random().toString(36).slice(2)}`,
              name: item.name ?? item.service_name ?? 'Serviço',
              company: {
                name: item.company?.name ?? item.carrier_name ?? 'Transportadora',
                picture: item.company?.picture ?? item.logo ?? '',
              },
              price: priceStr,
              error: item.error_message ?? item.error ?? undefined,
              deviation: dim.deviation,
              totalSize: dim.length + dim.width + dim.height,
              originalDimensions,
              deliveryTime: item.delivery_time ?? item.estimated_delivery_time ?? undefined,
              volumeGain,
            } as ShippingRate;
          })
        );
      } catch (error: any) {
        console.error('[fetchShippingRates] erro na solicitação para dim', dim, error?.message ?? error);
      } finally {
        // registrar timestamp independente do resultado (conta para o throttle)
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

  // Separar disponíveis e indisponíveis
  const availableResults = allResults.filter((item) => item.price && !item.error);
  const unavailableResults = allResults.filter((item) => !item.price || item.error);

  // Ordenar disponívels com base em preço + desempate
  availableResults.sort((a, b) => {
    const priceA = parseFloat(a.price || '0') || Infinity;
    const priceB = parseFloat(b.price || '0') || Infinity;

    if (Math.abs(priceA - priceB) <= costTolerance) {
      if (b.totalSize !== a.totalSize) {
        // priorizar caixas maiores (maior totalSize)
        return b.totalSize - a.totalSize;
      } else {
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
