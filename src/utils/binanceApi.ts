import { useEffect, useRef, useState } from 'react';

// Базовые URL для API Binance
export const BINANCE_BASE_URL = 'https://api.binance.com';
export const BINANCE_FUTURES_URL = 'https://fapi.binance.com';
export const BINANCE_WS_BASE_URL = 'wss://stream.binance.com:9443/ws';
export const BINANCE_FUTURES_WS_URL = 'wss://fstream.binance.com/ws';

// Интерфейсы для данных стакана
export interface OrderBookEntry {
  price: number;
  amount: number;
  total: number; // Теперь это обязательное поле
}

export interface OrderBookData {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  lastUpdateId: number;
}

// Функция для получения данных стакана через REST API
export const fetchOrderBook = async (
  symbol: string, 
  limit: number = 20, 
  isFuture: boolean = false
): Promise<OrderBookData> => {
  const baseUrl = isFuture ? BINANCE_FUTURES_URL : BINANCE_BASE_URL;
  const endpoint = isFuture ? '/fapi/v1/depth' : '/api/v3/depth';
  
  const response = await fetch(`${baseUrl}${endpoint}?symbol=${symbol.toUpperCase()}&limit=${limit}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch order book: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  // Преобразуем данные в нужный формат
  const bids: OrderBookEntry[] = [];
  const asks: OrderBookEntry[] = [];
  
  let bidTotal = 0;
  data.bids.forEach((bid: [string, string]) => {
    const price = parseFloat(bid[0]);
    const amount = parseFloat(bid[1]);
    bidTotal += amount;
    bids.push({ price, amount, total: bidTotal });
  });
  
  let askTotal = 0;
  data.asks.forEach((ask: [string, string]) => {
    const price = parseFloat(ask[0]);
    const amount = parseFloat(ask[1]);
    askTotal += amount;
    asks.push({ price, amount, total: askTotal });
  });
  
  return {
    bids,
    asks,
    lastUpdateId: data.lastUpdateId
  };
};

// Хук для подключения к WebSocket и получения обновлений стакана
export const useOrderBookWebSocket = (
  symbol: string, 
  limit: number = 20, 
  isFuture: boolean = false
) => {
  const [orderBook, setOrderBook] = useState<OrderBookData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const lastUpdateIdRef = useRef<number>(0);
  
  useEffect(() => {
    const initOrderBook = async () => {
      try {
        // Сначала получаем снимок стакана через REST API
        const snapshot = await fetchOrderBook(symbol, limit, isFuture);
        lastUpdateIdRef.current = snapshot.lastUpdateId;
        setOrderBook(snapshot);
        
        // Затем подключаемся к WebSocket для получения обновлений
        const baseWsUrl = isFuture ? BINANCE_FUTURES_WS_URL : BINANCE_WS_BASE_URL;
        const streamName = isFuture ? `${symbol.toLowerCase()}@depth@100ms` : `${symbol.toLowerCase()}@depth`;
        
        ws.current = new WebSocket(`${baseWsUrl}/${streamName}`);
        
        ws.current.onopen = () => {
          console.log(`WebSocket connected for ${symbol}`);
          setLoading(false);
        };
        
        ws.current.onmessage = (event) => {
          const data = JSON.parse(event.data);
          
          // Проверяем, что это не устаревшие данные
          if (data.u <= lastUpdateIdRef.current) {
            return;
          }
          
          // Обновляем стакан
          setOrderBook(prevOrderBook => {
            if (!prevOrderBook) return null;
            
            const newBids = [...prevOrderBook.bids];
            const newAsks = [...prevOrderBook.asks];
            
            // Обновляем ставки на покупку (bids)
            data.b.forEach((bid: [string, string]) => {
              const price = parseFloat(bid[0]);
              const amount = parseFloat(bid[1]);
              
              // Если количество равно 0, удаляем уровень цены
              if (amount === 0) {
                const index = newBids.findIndex(b => b.price === price);
                if (index !== -1) {
                  newBids.splice(index, 1);
                }
              } else {
                // Иначе обновляем или добавляем уровень цены
                const index = newBids.findIndex(b => b.price === price);
                if (index !== -1) {
                  newBids[index].amount = amount;
                } else {
                  // Вставляем новый уровень цены в правильном порядке (по убыванию)
                  let insertIndex = 0;
                  while (insertIndex < newBids.length && newBids[insertIndex].price > price) {
                    insertIndex++;
                  }
                  newBids.splice(insertIndex, 0, { price, amount, total: amount });
                }
              }
            });
            
            // Обновляем ставки на продажу (asks)
            data.a.forEach((ask: [string, string]) => {
              const price = parseFloat(ask[0]);
              const amount = parseFloat(ask[1]);
              
              if (amount === 0) {
                const index = newAsks.findIndex(a => a.price === price);
                if (index !== -1) {
                  newAsks.splice(index, 1);
                }
              } else {
                const index = newAsks.findIndex(a => a.price === price);
                if (index !== -1) {
                  newAsks[index].amount = amount;
                } else {
                  // Вставляем новый уровень цены в правильном порядке (по возрастанию)
                  let insertIndex = 0;
                  while (insertIndex < newAsks.length && newAsks[insertIndex].price < price) {
                    insertIndex++;
                  }
                  newAsks.splice(insertIndex, 0, { price, amount, total: amount });
                }
              }
            });
            
            // Обновляем общие суммы
            let bidTotal = 0;
            newBids.forEach(bid => {
              bidTotal += bid.amount;
              bid.total = bidTotal;
            });
            
            let askTotal = 0;
            newAsks.forEach(ask => {
              askTotal += ask.amount;
              ask.total = askTotal;
            });
            
            // Ограничиваем количество уровней
            const limitedBids = newBids.slice(0, limit);
            const limitedAsks = newAsks.slice(0, limit);
            
            return {
              bids: limitedBids,
              asks: limitedAsks,
              lastUpdateId: data.u
            };
          });
          
          lastUpdateIdRef.current = data.u;
        };
        
        ws.current.onerror = (e) => {
          console.error('WebSocket error:', e);
          setError('Ошибка подключения к WebSocket');
        };
        
        ws.current.onclose = () => {
          console.log('WebSocket closed');
        };
      } catch (err) {
        console.error('Error initializing order book:', err);
        setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
        setLoading(false);
      }
    };
    
    initOrderBook();
    
    // Очистка при размонтировании компонента
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [symbol, limit, isFuture]);
  
  return { orderBook, loading, error };
};
