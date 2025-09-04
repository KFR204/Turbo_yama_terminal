import React, { useState } from 'react';
import './App.css';
import PairSelector from './components/PairSelector/PairSelector';
import CryptoChart from './components/CryptoChart/CryptoChart';
import OrderBook from './components/OrderBook/OrderBook';
import OpenPositions from './components/OpenPositions/OpenPositions';
import TradePanel from './components/TradePanel/TradePanel';

function App() {
  const [selectedPair, setSelectedPair] = useState<string>('BTCUSDT');
  const isFuture = true; // Всегда используем фьючерсы

  const handlePairChange = (pair: string) => {
    setSelectedPair(pair);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>Turbo Yama Terminal</h1>
          <PairSelector onPairChange={handlePairChange} selectedPair={selectedPair} isFuture={isFuture} />
        </div>
      </header>
      
      <main className="app-content">
        <div className="chart-container">
          <div className="main-chart-area">
            <CryptoChart pair={selectedPair} isFuture={isFuture} />
          </div>
          
          <div className="positions-section">
            <OpenPositions pair={selectedPair} isFuture={isFuture} />
          </div>
        </div>
        
        <div className="side-panel">
          <div className="trading-controls">
            <div className="order-book-section">
              <OrderBook pair={selectedPair} isFuture={isFuture} />
            </div>
            
            <div className="trade-panel-section">
              <TradePanel pair={selectedPair} isFuture={isFuture} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
