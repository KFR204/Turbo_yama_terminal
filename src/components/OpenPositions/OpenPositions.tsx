import React, { useState } from 'react';
import './OpenPositions.css';

interface OpenPositionsProps {
  pair: string;
  isFuture: boolean;
}

interface Position {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  size: number;
  entryPrice: number;
  markPrice: number;
  pnl: number;
  pnlPercent: number;
  liquidationPrice: number;
  margin: number;
  leverage: number;
}

const OpenPositions: React.FC<OpenPositionsProps> = ({ pair, isFuture }) => {
  // Тестовые данные для открытых позиций
  const [positions, setPositions] = useState<Position[]>([
    {
      id: '1',
      symbol: 'BTCUSDT',
      side: 'LONG',
      size: 0.1,
      entryPrice: 49500,
      markPrice: 50000,
      pnl: 50,
      pnlPercent: 1.01,
      liquidationPrice: 45000,
      margin: 500,
      leverage: 10
    },
    {
      id: '2',
      symbol: 'ETHUSDT',
      side: 'SHORT',
      size: 1.5,
      entryPrice: 3200,
      markPrice: 3150,
      pnl: 75,
      pnlPercent: 1.56,
      liquidationPrice: 3500,
      margin: 480,
      leverage: 10
    }
  ]);

  if (!isFuture) {
    return (
      <div className="open-positions-container">
        <div className="open-positions-header">
          <h3>Открытые позиции</h3>
        </div>
        <div className="no-positions">
          Открытые позиции доступны только для фьючерсов
        </div>
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="open-positions-container">
        <div className="open-positions-header">
          <h3>Открытые позиции</h3>
        </div>
        <div className="no-positions">
          У вас нет открытых позиций
        </div>
      </div>
    );
  }

  return (
    <div className="open-positions-container">
      <div className="open-positions-header">
        <h3>Открытые позиции</h3>
      </div>
      
      <div className="positions-table">
        <div className="positions-table-header">
          <div className="symbol-col">Символ</div>
          <div className="side-col">Сторона</div>
          <div className="size-col">Размер</div>
          <div className="entry-price-col">Цена входа</div>
          <div className="mark-price-col">Цена маркировки</div>
          <div className="pnl-col">PNL (USDT)</div>
          <div className="pnl-percent-col">PNL (%)</div>
          <div className="actions-col">Действия</div>
        </div>
        
        <div className="positions-table-body">
          {positions.map((position) => (
            <div key={position.id} className="position-row">
              <div className="symbol-col">{position.symbol}</div>
              <div className={`side-col ${position.side === 'LONG' ? 'long' : 'short'}`}>
                {position.side === 'LONG' ? 'Лонг' : 'Шорт'}
              </div>
              <div className="size-col">{position.size}</div>
              <div className="entry-price-col">{position.entryPrice.toFixed(2)}</div>
              <div className="mark-price-col">{position.markPrice.toFixed(2)}</div>
              <div className={`pnl-col ${position.pnl >= 0 ? 'profit' : 'loss'}`}>
                {position.pnl >= 0 ? '+' : ''}{position.pnl.toFixed(2)}
              </div>
              <div className={`pnl-percent-col ${position.pnlPercent >= 0 ? 'profit' : 'loss'}`}>
                {position.pnlPercent >= 0 ? '+' : ''}{position.pnlPercent.toFixed(2)}%
              </div>
              <div className="actions-col">
                <button className="close-position-btn">Закрыть</button>
                <button className="tp-sl-btn">TP/SL</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="positions-summary">
        <div className="summary-item">
          <span className="summary-label">Общий PNL:</span>
          <span className={`summary-value ${positions.reduce((sum, pos) => sum + pos.pnl, 0) >= 0 ? 'profit' : 'loss'}`}>
            {positions.reduce((sum, pos) => sum + pos.pnl, 0) >= 0 ? '+' : ''}
            {positions.reduce((sum, pos) => sum + pos.pnl, 0).toFixed(2)} USDT
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Маржа:</span>
          <span className="summary-value">
            {positions.reduce((sum, pos) => sum + pos.margin, 0).toFixed(2)} USDT
          </span>
        </div>
      </div>
    </div>
  );
};

export default OpenPositions;
