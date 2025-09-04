import React, { useState } from 'react';
import './OrderBook.css';
import { useOrderBookWebSocket } from '../../utils/binanceApi';

interface OrderBookProps {
  pair: string;
  isFuture: boolean;
}

const OrderBook: React.FC<OrderBookProps> = ({ pair, isFuture }) => {
  const [depthLevel, setDepthLevel] = useState<number>(20); // Глубина стакана
  const { orderBook, loading, error } = useOrderBookWebSocket(pair, depthLevel, isFuture);

  // Обработчик изменения глубины стакана
  const handleDepthChange = (depth: number) => {
    setDepthLevel(depth);
  };

  if (loading) {
    return <div className="order-book-container loading">Загрузка стакана...</div>;
  }

  if (error) {
    return <div className="order-book-container error">{error}</div>;
  }

  // Если данных нет, показываем сообщение
  if (!orderBook) {
    return <div className="order-book-container loading">Ожидание данных стакана...</div>;
  }

  // Получаем символ базовой валюты (например, BTC из BTCUSDT)
  const baseAsset = pair.replace(/USDT$/, '');
  
  // Рассчитываем спред
  const spread = orderBook.asks[0]?.price && orderBook.bids[0]?.price 
    ? orderBook.asks[0].price - orderBook.bids[0].price 
    : 0;
  
  // Рассчитываем процент спреда
  const spreadPercent = orderBook.asks[0]?.price 
    ? (spread / orderBook.asks[0].price) * 100 
    : 0;

  // Получаем максимальные значения для визуализации глубины
  // Используем явное приведение типов, чтобы избежать ошибок с undefined
  const maxAskTotal: number = orderBook.asks.length > 0 && 
    typeof orderBook.asks[orderBook.asks.length - 1].total === 'number'
    ? orderBook.asks[orderBook.asks.length - 1].total as number
    : 1;
    
  const maxBidTotal: number = orderBook.bids.length > 0 && 
    typeof orderBook.bids[orderBook.bids.length - 1].total === 'number'
    ? orderBook.bids[orderBook.bids.length - 1].total as number
    : 1;

  return (
    <div className="order-book-container">
      <div className="order-book-header">
        <h3>Стакан</h3>
        <div className="order-book-controls">
          <button 
            className={`depth-button ${depthLevel === 10 ? 'active' : ''}`} 
            onClick={() => handleDepthChange(10)}
          >
            10
          </button>
          <button 
            className={`depth-button ${depthLevel === 20 ? 'active' : ''}`} 
            onClick={() => handleDepthChange(20)}
          >
            20
          </button>
          <button 
            className={`depth-button ${depthLevel === 50 ? 'active' : ''}`} 
            onClick={() => handleDepthChange(50)}
          >
            50
          </button>
        </div>
      </div>
      
      <div className="order-book-table-header">
        <div className="price-col">Цена (USDT)</div>
        <div className="amount-col">Количество ({baseAsset})</div>
        <div className="total-col">Всего</div>
      </div>
      
      <div className="order-book-asks">
        {orderBook.asks.slice().reverse().map((ask, index) => (
          <div key={`ask-${ask.price}`} className="order-book-row ask">
            <div className="price-col">{ask.price.toFixed(2)}</div>
            <div className="amount-col">{ask.amount.toFixed(4)}</div>
            <div className="total-col">{ask.total?.toFixed(4) || '0.0000'}</div>
            <div 
              className="depth-visualization" 
              style={{ 
                width: `${typeof ask.total === 'number' ? (ask.total / maxAskTotal) * 100 : 0}%` 
              }} 
            />
          </div>
        ))}
      </div>
      
      <div className="order-book-spread">
        <span className="spread-price">
          {spread.toFixed(2)}
        </span>
        <span className="spread-label">
          СПРЕД ({spreadPercent.toFixed(2)}%)
        </span>
      </div>
      
      <div className="order-book-bids">
        {orderBook.bids.map((bid, index) => (
          <div key={`bid-${bid.price}`} className="order-book-row bid">
            <div className="price-col">{bid.price.toFixed(2)}</div>
            <div className="amount-col">{bid.amount.toFixed(4)}</div>
            <div className="total-col">{bid.total?.toFixed(4) || '0.0000'}</div>
            <div 
              className="depth-visualization" 
              style={{ 
                width: `${typeof bid.total === 'number' ? (bid.total / maxBidTotal) * 100 : 0}%` 
              }} 
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderBook;
