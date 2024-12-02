// utils.ts

import axios from 'axios';
import { ShippingRate } from './types';

const melhorEnvioToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiNDBjNTAzNmY4NDEzY2VmMTRiMmM1NjkyY2I2MDAwZTFkNGM1ZDMzNDA4ZTFlZTNlN2YxZGExNTc3ODdjZWY5ZmI1YzFhNDU2OWUyODYzOTciLCJpYXQiOjE3MzA4NDc5NjcuODU4NzMxLCJuYmYiOjE3MzA4NDc5NjcuODU4NzM0LCJleHAiOjE3NjIzODM5NjcuODQ1MjcyLCJzdWIiOiI5YjRiZWY2NC04MGQyLTQ0ZTQtOGNmZi1iMjIxYjIxOGM2NjYiLCJzY29wZXMiOlsic2hpcHBpbmctY2FsY3VsYXRlIl19.1WnxBEbYi6SLNNyJxv1J6Aod5yNZHpUYwqNU_4yTImeFQzRm6IreigqjWIBVmdgiE3RSlhefTKW29_z8j5MSyju5MCFmZ6gTmP1w1f-hFQyaccAKajZzDlBqs12LXSdgDMLppu8_R5u6bdv4wIlIBxxrbF-bq-u2un2RhPJf1aZI-xOnx7UKoKoRZH-9xf_oqfXobYfwQaoUGRMC5eyLzMmETfg2qeiFeVTV-kwbEjVvqe6G-pPP4JaMI1q7JqK0Sdn6KtKggmTE3TSw7gh9WJEZ2euIZ1MxQxo4NXcjFzli-J13N-KuIldI0D85O_mSjnhylZtEg3tucMBGaWmHNzJ_C5tkGvWxj7iPs0VpvUq-x0jdO2e5f0N7iWUxZkYepBtwDOrxJlUpsP7U6CvORFj2gD2Ec5vBcUR5FkFvSPyhTvp7GvYvF5Xb2fKMING6mGyUFgk7sAaFmikEtOejPVgbv7gwPYd4pubBJb2qc0IBtkI9j-G84w_cxbsBhMrw0EnCW3u88OmwgW9eFHEnGdM9L25uWyphgOwwJPWCu-BOal30Elo5nUZ7BxN1qJBKcCBBsi5NanIJbouKWK7HqgDqKVk2HYkXIo_Cmtp-CfCtzyznj9A8URrCgC45oHHypOEhGuZ71ZEFQh0WZXSXZAoLnejvmPZ6DKhnsvicpmo'; // Substitua pelo seu token do Melhor Envio

export const fetchShippingRates = async (
  originCep: string,
  destinationCep: string,
  length: string,
  width: string,
  height: string,
  weight: string,
  insuranceValue: string
): Promise<ShippingRate[]> => {
  const deviations = [-2, -1, 0, 1, 2];

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
            };
          })
        );
      } catch (error) {
        console.error('Erro na solicitação:', error);
      }
    });

    await Promise.all(promises);
  }

  // Separar resultados disponíveis e indisponíveis
  const availableResults = allResults.filter(
    (item) => item.price && !item.error
  );

  const unavailableResults = allResults.filter(
    (item) => !item.price || item.error
  );

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
