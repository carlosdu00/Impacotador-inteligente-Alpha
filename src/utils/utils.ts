// src/utils/utils.ts
import axios from 'axios';
import { ShippingRate, DeviationRange } from '../types/types';
import { EXPO_melhorEnvioToken } from '@env';
import firebase from '../services/firebaseConfig';

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

const rangeToArray = (min: number, max: number) => {
  const arr: number[] = [];
  for (let i = min; i <= max; i++) arr.push(i);
  return arr;
};

const headers = {
  Accept: 'application/json',
  Authorization: `Bearer ${melhorEnvioToken}`,
  'Content-Type': 'application/json',
};

const normalizeResponseItems = (data: any) => {
  let items: any[] = [];
  if (Array.isArray(data)) {
    items = data;
  } else if (Array.isArray(data.services)) {
    items = data.services;
  } else if (Array.isArray(data.data)) {
    items = data.data;
  } else if (data && typeof data === 'object') {
    items = [data];
  }
  return items;
};

const mapItemToShippingRate = (
  item: any,
  deviation: { length: number; width: number; height: number },
  originalDimensions: { length: number; width: number; height: number }
): (ShippingRate & { priceNumber?: number }) => {
  const originalVolume = originalDimensions.length * originalDimensions.width * originalDimensions.height;
  const newVolume =
    (originalDimensions.length + deviation.length) *
    (originalDimensions.width + deviation.width) *
    (originalDimensions.height + deviation.height);
  const volumeGain = originalVolume > 0 ? ((newVolume - originalVolume) / originalVolume) * 100 : 0;

  const priceStr = item.price !== undefined && item.price !== null ? String(item.price) : '';
  const parsed = parseFloat(priceStr.replace(',', '.'));
  const priceNumber = Number.isFinite(parsed) ? parsed : undefined;

  return {
    id: item.id ?? `${item.service_id ?? item.name ?? Math.random().toString(36).slice(2)}`,
    name: item.name ?? item.service_name ?? 'Serviço',
    company: {
      name: item.company?.name ?? item.carrier_name ?? 'Transportadora',
      picture: item.company?.picture ?? item.logo ?? '',
    },
    price: priceStr,
    priceNumber,
    error: item.error_message ?? item.error ?? undefined,
    deviation,
    totalSize:
      deviation.length +
      deviation.width +
      deviation.height +
      originalDimensions.length +
      originalDimensions.width +
      originalDimensions.height,
    originalDimensions,
    deliveryTime: item.delivery_time ?? item.estimated_delivery_time ?? undefined,
    volumeGain,
  } as any;
};

/**
 * Se não houver uma tabela /operationalCosts no Firebase, gera uma entrada inicial:
 * - roda uma simulação "qualquer" entre um CEP de Porto Alegre e um CEP de São Paulo
 * - coleta as transportadoras retornadas e salva em /operationalCosts com operationalCost = 0 e samplePrice
 *
 * Retorna o objeto salvo no banco no formato:
 * { [carrierName]: { operationalCost: number, samplePrice: number | null } }
 */
export const ensureOperationalCostsInDb = async (): Promise<Record<string, { operationalCost: number; samplePrice: number | null }>> => {
  try {
    const ref = firebase.database().ref('/operationalCosts');
    const snapshot = await ref.once('value');
    const val = snapshot.val();
    if (val && Object.keys(val).length > 0) {
      return val;
    }

    // se não existe, rodar simulação entre Porto Alegre e São Paulo com medidas padrão
    const portoAlegreCep = '90010000'; // exemplo
    const saoPauloCep = '01001000'; // exemplo

    const length = 20;
    const width = 20;
    const height = 20;
    const weight = 1;
    const insuranceValue = 10;

    const compute = async (origin: string, dest: string) => {
      const payload = {
        from: { postal_code: origin },
        to: { postal_code: dest },
        products: [{ width, height, length, weight, insurance_value: insuranceValue, quantity: 1 }],
        options: { receipt: false, own_hand: false, collect: false },
        services: '',
      };

      try {
        const response = await axios.post('https://www.melhorenvio.com.br/api/v2/me/shipment/calculate', payload, { headers, timeout: 20000 });
        return normalizeResponseItems(response.data);
      } catch (err: any) {
        console.error('[ensureOperationalCostsInDb] erro ao obter amostra de transportadoras', err?.message ?? err);
        return [];
      }
    };

    const items = await compute(portoAlegreCep, saoPauloCep);

    const map: Record<string, { operationalCost: number; samplePrice: number | null }> = {};

    for (const it of items) {
      const carrierName = it.company?.name ?? it.carrier_name ?? 'Transportadora';
      const priceStr = it.price !== undefined && it.price !== null ? String(it.price) : '';
      const parsed = parseFloat(priceStr.replace(',', '.'));
      const samplePrice = Number.isFinite(parsed) ? parsed : null;
      if (!map[carrierName]) {
        map[carrierName] = { operationalCost: 0, samplePrice };
      }
    }

    await ref.set(map);
    return map;
  } catch (err: any) {
    console.error('[ensureOperationalCostsInDb] erro', err?.message ?? err);
    return {};
  }
};

/**
 * Faz uma única chamada ao endpoint de cálculo do MelhorEnvio com as dimensões recebidas
 * packagingProtectionCm é adicionado às 3 dimensões (em cm) antes de enviar a requisição.
 * Retenta em caso de 429/5xx com backoff simples.
 */
export const computeCheapestSingle = async (
  originCep: string,
  destinationCep: string,
  length: number,
  width: number,
  height: number,
  weight: number,
  insuranceValue: number,
  packagingProtectionCm = 0,
  timeout = 20000
): Promise<{ cheapestPrice: number | null; items: (ShippingRate & { priceNumber?: number })[] }> => {
  const paddedLength = Math.max(1, length + packagingProtectionCm);
  const paddedWidth = Math.max(1, width + packagingProtectionCm);
  const paddedHeight = Math.max(1, height + packagingProtectionCm);

  const payload = {
    from: { postal_code: originCep },
    to: { postal_code: destinationCep },
    products: [
      {
        width: paddedWidth,
        height: paddedHeight,
        length: paddedLength,
        weight,
        insurance_value: insuranceValue,
        quantity: 1,
      },
    ],
    options: { receipt: false, own_hand: false, collect: false },
    services: '',
  };

  let attempts = 0;
  const maxAttempts = 4;
  let lastError: any = null;

  while (attempts < maxAttempts) {
    const now = Date.now();
    requestTimestamps = requestTimestamps.filter((t) => now - t < REQUESTS_WINDOW_MS);
    if (requestTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
      await sleep(1000);
      continue;
    }

    try {
      const response = await axios.post('https://www.melhorenvio.com.br/api/v2/me/shipment/calculate', payload, { headers, timeout });
      const rawItems = normalizeResponseItems(response.data);
      const items = rawItems.map((item: any) => mapItemToShippingRate(item, { length: 0, width: 0, height: 0 }, { length: paddedLength, width: paddedWidth, height: paddedHeight }));

      requestTimestamps.push(Date.now());

      const validPrices = items.map((i) => i.priceNumber).filter((p) => p != null) as number[];
      const min = validPrices.length > 0 ? Math.min(...validPrices) : null;

      return { cheapestPrice: min, items };
    } catch (err: any) {
      lastError = err;
      attempts++;
      const status = err?.response?.status;
      if (status === 429 || (status >= 500 && status < 600)) {
        const backoffMs = Math.pow(2, attempts) * 500;
        await sleep(backoffMs);
        continue;
      } else {
        requestTimestamps.push(Date.now());
        break;
      }
    }
  }

  console.error('[computeCheapestSingle] erro após tentativas:', lastError?.message ?? lastError);
  return { cheapestPrice: null, items: [] };
};

/**
 * Compara rotas via baldeações: para cada CEP de baldeação faz:
 *  custo_total = cheapest(origin -> baldeacao) + cheapest(baldeacao -> destination)
 * packagingProtectionCm é reaplicado em cada perna.
 */
export const computeBaldeacaoComparisons = async (
  originCep: string,
  destinationCep: string,
  length: number,
  width: number,
  height: number,
  weight: number,
  insuranceValue: number,
  baldeacoes: string[],
  packagingProtectionCm = 0
): Promise<
  {
    baldeacaoCep: string;
    totalPrice: number | null;
    leg1?: { cheapestPrice: number | null };
    leg2?: { cheapestPrice: number | null };
    isBetterThanDirect?: boolean;
  }[]
> => {
  const results: any[] = [];

  try {
    const direct = await computeCheapestSingle(originCep, destinationCep, length, width, height, weight, insuranceValue, packagingProtectionCm);

    for (const b of baldeacoes) {
      const leg1 = await computeCheapestSingle(originCep, b, length, width, height, weight, insuranceValue, packagingProtectionCm);
      const leg2 = await computeCheapestSingle(b, destinationCep, length, width, height, weight, insuranceValue, packagingProtectionCm);

      const cheapest1 = leg1.cheapestPrice;
      const cheapest2 = leg2.cheapestPrice;

      const total = (cheapest1 ?? Infinity) + (cheapest2 ?? Infinity);
      const totalNormalized = Number.isFinite(total) && total < Infinity ? Number((total).toFixed(2)) : null;

      results.push({
        baldeacaoCep: b,
        totalPrice: totalNormalized,
        leg1: { cheapestPrice: leg1.cheapestPrice ?? null },
        leg2: { cheapestPrice: leg2.cheapestPrice ?? null },
        isBetterThanDirect: (totalNormalized !== null && direct.cheapestPrice !== null) ? (totalNormalized < direct.cheapestPrice) : false,
      });
    }
  } catch (err: any) {
    console.error('[computeBaldeacaoComparisons] erro', err?.message ?? err);
  }

  return results;
};

/**
 * Função principal fetchShippingRates — packagingProtectionCm em cm é adicionado às dimensões.
 * NOTE: operationalCosts agora é obtido por leitura externa (Personalization). Essa função NÃO altera a base de dados.
 */
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
  onProgress?: (progress: number, completedRequests: number, totalRequests: number) => void,
  operationalCosts?: Record<string, number>, // valor monetário por transportadora (R$)
  packagingProtectionCm: number = 0
): Promise<ShippingRate[]> => {
  const originalDimensions = {
    length: Number(length),
    width: Number(width),
    height: Number(height),
  };

  const lengthMin = Math.max(0, deviationRange.length.min);
  const widthMin = Math.max(0, deviationRange.width.min);
  const heightMin = Math.max(0, deviationRange.height.min);

  const lengthDeviations = rangeToArray(lengthMin, Math.max(lengthMin, deviationRange.length.max));
  const widthDeviations = rangeToArray(widthMin, Math.max(widthMin, deviationRange.width.max));
  const heightDeviations = rangeToArray(heightMin, Math.max(heightMin, deviationRange.height.max));

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
        const newL = Math.max(originalDimensions.length + dL + packagingProtectionCm, 1);
        const newW = Math.max(originalDimensions.width + dW + packagingProtectionCm, 1);
        const newH = Math.max(originalDimensions.height + dH + packagingProtectionCm, 1);

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
  const allResults: (ShippingRate & { priceNumber?: number })[] = [];

  const calculateDistribution = (deviations: number[]) => {
    const mean = deviations.reduce((s, v) => s + v, 0) / deviations.length;
    return deviations.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0);
  };

  let i = 0;
  while (i < dimensionVariations.length) {
    const now = Date.now();
    requestTimestamps = requestTimestamps.filter((t) => now - t < REQUESTS_WINDOW_MS);

    if (requestTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
      await sleep(1000);
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
        let attempts = 0;
        const maxAttempts = 3;
        let response: any = null;
        while (attempts < maxAttempts) {
          try {
            response = await axios.post('https://www.melhorenvio.com.br/api/v2/me/shipment/calculate', payload, { headers, timeout: 20_000 });
            break;
          } catch (err: any) {
            const status = err?.response?.status;
            attempts++;
            if (status === 429 || (status >= 500 && status < 600)) {
              const backoffMs = Math.pow(2, attempts) * 500;
              await sleep(backoffMs);
              continue;
            } else {
              throw err;
            }
          }
        }

        if (!response) throw new Error('Sem resposta do servidor');

        const rawItems = normalizeResponseItems(response.data);

        const mapped = rawItems.map((item: any) =>
          mapItemToShippingRate(item, dim.deviation, { length: dim.length, width: dim.width, height: dim.height })
        );

        // aplicar custo operacional monetário por transportadora (se informado)
        for (const it of mapped) {
          const carrierName = it.company?.name ?? '';
          const op = operationalCosts?.[carrierName] ?? 0;
          if (it.priceNumber != null) {
            it.priceNumber = Number((it.priceNumber + op).toFixed(2));
            it.price = it.priceNumber.toString();
          } else {
            it.priceNumber = undefined;
          }
        }

        allResults.push(...mapped);
      } catch (err: any) {
        console.error('[fetchShippingRates] erro na solicitação para dim', dim, err?.message ?? err);
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
    i += MAX_CONCURRENT_REQUESTS;
  }

  const availableResults = allResults.filter((item) => item.priceNumber != null && !item.error);
  const unavailableResults = allResults.filter((item) => item.priceNumber == null || item.error);

  availableResults.sort((a, b) => {
    const priceA = a.priceNumber ?? Infinity;
    const priceB = b.priceNumber ?? Infinity;

    if (Math.abs(priceA - priceB) <= costTolerance) {
      if (b.totalSize !== a.totalSize) {
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

  const sortedResults: ShippingRate[] = [
    ...availableResults.map((it) => {
      const priceNumber = it.priceNumber;
      const { priceNumber: _, ...rest } = it as any;
      return { ...rest, price: priceNumber !== undefined && priceNumber !== null ? priceNumber.toFixed(2) : rest.price } as ShippingRate;
    }),
    ...unavailableResults.map((it) => {
      const { priceNumber: _, ...rest } = it as any;
      return { ...rest, price: rest.price ?? '' } as ShippingRate;
    }),
  ];

  return sortedResults;
};
