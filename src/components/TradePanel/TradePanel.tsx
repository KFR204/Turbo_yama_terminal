import React, { useState, useEffect } from 'react';
import './TradePanel.css';

interface TradePanelProps {
  pair: string;
  isFuture: boolean;
}

const TradePanel: React.FC<TradePanelProps> = ({ pair, isFuture }) => {
  const [orderType, setOrderType] = useState<'limit' | 'market'>('limit');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [price, setPrice] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [leverage, setLeverage] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);
  const [availableBalance, setAvailableBalance] = useState<number>(10000); // Тестовый баланс

  // Расчет общей суммы при изменении цены или количества
  useEffect(() => {
    if (price && amount) {
      setTotal(parseFloat(price) * parseFloat(amount));
    } else {
      setTotal(0);
    }
  }, [price, amount]);

  // Обработчик изменения типа ордера
  const handleOrderTypeChange = (type: 'limit' | 'market') => {
    setOrderType(type);
    if (type === 'market') {
      setPrice(''); // Для рыночного ордера цена не нужна
    }
  };

  // Обработчик изменения стороны (покупка/продажа)
  const handleSideChange = (newSide: 'buy' | 'sell') => {
    setSide(newSide);
  };

  // Обработчик изменения плеча
  const handleLeverageChange = (newLeverage: number) => {
    setLeverage(newLeverage);
  };

  // Обработчик отправки ордера
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Здесь будет логика отправки ордера на сервер
    console.log('Отправка ордера:', {
      pair,
      orderType,
      side,
      price: orderType === 'market' ? 'market' : price,
      amount,
      leverage: isFuture ? leverage : 1,
      total
    });
  };

  // Предустановленные проценты от баланса
  const percentOptions = [25, 50, 75, 100];

  // Установка суммы на основе процента от баланса
  const setAmountByPercent = (percent: number) => {
    if (price && orderType === 'limit') {
      const calculatedAmount = ((availableBalance * percent) / 100) / parseFloat(price);
      setAmount(calculatedAmount.toFixed(6));
    } else if (orderType === 'market') {
      const estimatedAmount = ((availableBalance * percent) / 100) / 50000; // Примерная цена
      setAmount(estimatedAmount.toFixed(6));
    }
  };

  return (
    <div className="trade-panel-container">
      <div className="trade-panel-header">
        <h3>Торговля {pair}</h3>
      </div>
      
      <form className="trade-form" onSubmit={handleSubmit}>
        <div className="order-type-selector">
          <button
            type="button"
            className={`order-type-btn ${orderType === 'limit' ? 'active' : ''}`}
            onClick={() => handleOrderTypeChange('limit')}
          >
            Лимитный
          </button>
          <button
            type="button"
            className={`order-type-btn ${orderType === 'market' ? 'active' : ''}`}
            onClick={() => handleOrderTypeChange('market')}
          >
            Рыночный
          </button>
        </div>
        
        <div className="side-selector">
          <button
            type="button"
            className={`side-btn buy ${side === 'buy' ? 'active' : ''}`}
            onClick={() => handleSideChange('buy')}
          >
            Купить/Лонг
          </button>
          <button
            type="button"
            className={`side-btn sell ${side === 'sell' ? 'active' : ''}`}
            onClick={() => handleSideChange('sell')}
          >
            Продать/Шорт
          </button>
        </div>
        
        {isFuture && (
          <div className="leverage-selector">
            <label>Плечо: {leverage}x</label>
            <div className="leverage-buttons">
              {[1, 5, 10, 20, 50, 100].map(lev => (
                <button
                  key={lev}
                  type="button"
                  className={`leverage-btn ${leverage === lev ? 'active' : ''}`}
                  onClick={() => handleLeverageChange(lev)}
                >
                  {lev}x
                </button>
              ))}
            </div>
          </div>
        )}
        
        {orderType === 'limit' && (
          <div className="form-group">
            <label>Цена (USDT)</label>
            <input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Введите цену"
              required={orderType === 'limit'}
            />
          </div>
        )}
        
        <div className="form-group">
          <label>Количество ({pair.replace('USDT', '')})</label>
          <input
            type="number"
            step="0.000001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Введите количество"
            required
          />
          <div className="percent-buttons">
            {percentOptions.map(percent => (
              <button
                key={percent}
                type="button"
                className="percent-btn"
                onClick={() => setAmountByPercent(percent)}
              >
                {percent}%
              </button>
            ))}
          </div>
        </div>
        
        <div className="form-group">
          <label>Всего (USDT)</label>
          <div className="total-value">{total.toFixed(2)}</div>
        </div>
        
        <div className="form-group">
          <label>Доступно: {availableBalance.toFixed(2)} USDT</label>
        </div>
        
        <button
          type="submit"
          className={`submit-btn ${side === 'buy' ? 'buy' : 'sell'}`}
        >
          {side === 'buy' ? 'Купить/Лонг' : 'Продать/Шорт'} {pair.replace('USDT', '')}
        </button>
      </form>
    </div>
  );
};

export default TradePanel;
