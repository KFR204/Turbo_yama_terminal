import axios from 'axios';

// Базовый URL для API Binance Фьючерсов
const FUTURES_BASE_URL = 'https://fapi.binance.com/fapi/v1';
// Базовый URL для WebSocket API Binance Фьючерсов
const FUTURES_WS_BASE_URL = 'wss://fstream.binance.com/ws';

// Базовый URL для API Binance Спот
const SPOT_BASE_URL = 'https://api.binance.com/api/v3';
// Базовый URL для WebSocket API Binance Спот
const SPOT_WS_BASE_URL = 'wss://stream.binance.com:9443/ws';

// Интерфейс для данных свечей
export interface CandlestickData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  closeTime?: number;
  quoteAssetVolume?: number;
  trades?: number;
  takerBuyBaseAssetVolume?: number;
  takerBuyQuoteAssetVolume?: number;
}

/**
 * Получение списка доступных пар с Binance
 * @param isFuture Флаг для выбора фьючерсов или спота
 */
export const fetchAvailablePairs = async (isFuture: boolean = true): Promise<string[]> => {
  try {
    const baseUrl = isFuture ? FUTURES_BASE_URL : SPOT_BASE_URL;
    const response = await axios.get(`${baseUrl}/exchangeInfo`);
    const symbols = response.data.symbols
      .filter((symbol: any) => symbol.status === 'TRADING')
      .map((symbol: any) => symbol.symbol);
    
    return symbols;
  } catch (error) {
    console.error(`Ошибка при получении списка пар ${isFuture ? 'фьючерсов' : 'спот'}:`, error);
    throw error;
  }
};

/**
 * Получение данных свечей для указанной пары
 * @param symbol Символ пары (например, BTCUSDT)
 * @param interval Интервал свечей (по умолчанию 1h)
 * @param isFuture Флаг для выбора фьючерсов или спота
 * @param limit Количество свечей (по умолчанию 500)
 */
export const fetchCandlestickData = async (
  symbol: string,
  interval: string = '1h',
  isFuture: boolean = true,
  limit: number = 500
): Promise<CandlestickData[]> => {
  try {
    const baseUrl = isFuture ? FUTURES_BASE_URL : SPOT_BASE_URL;
    const response = await axios.get(`${baseUrl}/klines`, {
      params: {
        symbol,
        interval,
        limit,
      },
    });

    // Преобразование данных в формат, подходящий для TradingView Lightweight Charts
    const candlesticks = response.data.map((candle: any) => ({
      time: candle[0] / 1000, // Время в секундах (UNIX timestamp)
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4]),
      volume: parseFloat(candle[5]),
      closeTime: candle[6],
      quoteAssetVolume: parseFloat(candle[7]),
      trades: candle[8],
      takerBuyBaseAssetVolume: parseFloat(candle[9]),
      takerBuyQuoteAssetVolume: parseFloat(candle[10]),
    }));

    return candlesticks;
  } catch (error) {
    console.error(`Ошибка при получении данных свечей ${isFuture ? 'фьючерсов' : 'спот'} для ${symbol}:`, error);
    throw error;
  }
};

/**
 * Создание WebSocket соединения для получения данных свечей в реальном времени
 * @param symbol Символ пары (например, BTCUSDT)
 * @param interval Интервал свечей (по умолчанию 1h)
 * @param onMessage Функция обратного вызова для обработки сообщений
 * @param isFuture Флаг для выбора фьючерсов или спота
 */
export const createCandlestickWebSocket = (
  symbol: string,
  interval: string = '1h',
  onMessage: (data: CandlestickData) => void,
  isFuture: boolean = true
): WebSocket => {
  const wsBaseUrl = isFuture ? FUTURES_WS_BASE_URL : SPOT_WS_BASE_URL;
  const ws = new WebSocket(`${wsBaseUrl}/${symbol.toLowerCase()}@kline_${interval}`);
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.k) {
      const candlestick: CandlestickData = {
        time: data.k.t / 1000,
        open: parseFloat(data.k.o),
        high: parseFloat(data.k.h),
        low: parseFloat(data.k.l),
        close: parseFloat(data.k.c),
        volume: parseFloat(data.k.v),
        closeTime: data.k.T,
        quoteAssetVolume: parseFloat(data.k.q),
        trades: data.k.n,
        takerBuyBaseAssetVolume: parseFloat(data.k.V),
        takerBuyQuoteAssetVolume: parseFloat(data.k.Q),
      };
      
      onMessage(candlestick);
    }
  };
  
  ws.onerror = (error) => {
    console.error(`WebSocket ошибка для ${symbol}:`, error);
  };
  
  ws.onclose = () => {
    console.log(`WebSocket соединение закрыто для ${symbol}`);
  };
  
  return ws;
};

/**
 * Получение текущей цены для указанной пары
 * @param symbol Символ пары (например, BTCUSDT)
 * @param isFuture Флаг для выбора фьючерсов или спота
 */
export const fetchCurrentPrice = async (symbol: string, isFuture: boolean = true): Promise<number> => {
  try {
    const baseUrl = isFuture ? FUTURES_BASE_URL : SPOT_BASE_URL;
    const response = await axios.get(`${baseUrl}/ticker/price`, {
      params: { symbol },
    });
    
    return parseFloat(response.data.price);
  } catch (error) {
    console.error(`Ошибка при получении текущей цены ${isFuture ? 'фьючерса' : 'спот'} для ${symbol}:`, error);
    throw error;
  }
};
