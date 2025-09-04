import React, { useEffect, useState, useRef } from 'react';
import './PairSelector.css';
import { fetchAvailablePairs } from '../../services/binanceService';

interface PairSelectorProps {
  onPairChange: (pair: string) => void;
  selectedPair?: string;
  isFuture?: boolean;
}

const PairSelector: React.FC<PairSelectorProps> = ({ onPairChange, selectedPair: externalSelectedPair, isFuture = true }) => {
  const [pairs, setPairs] = useState<string[]>([]);
  const [selectedPair, setSelectedPair] = useState<string>(externalSelectedPair || 'BTCUSDT');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Обновляем внутреннее состояние, когда меняется внешнее значение
  useEffect(() => {
    if (externalSelectedPair) {
      setSelectedPair(externalSelectedPair);
    }
  }, [externalSelectedPair]);

  // Загрузка пар при монтировании компонента или изменении isFuture
  useEffect(() => {
    const loadPairs = async () => {
      try {
        setLoading(true);
        const availablePairs = await fetchAvailablePairs(isFuture);
        // Фильтруем только перпетуальные фьючерсы с USDT
        const usdtPairs = availablePairs.filter(pair => pair.endsWith('USDT') && !pair.includes('_'));
        setPairs(usdtPairs);
        
        // Если выбранная пара не найдена в списке, выбираем первую
        if (usdtPairs.length > 0 && !usdtPairs.includes(selectedPair)) {
          setSelectedPair(usdtPairs[0]);
          onPairChange(usdtPairs[0]);
        } else if (usdtPairs.length > 0) {
          onPairChange(selectedPair);
        }
        
        setError(null);
      } catch (err) {
        console.error(`Ошибка при загрузке пар ${isFuture ? 'фьючерсов' : 'спот'}:`, err);
        setError(`Не удалось загрузить список ${isFuture ? 'фьючерсов' : 'пар'}. Пожалуйста, попробуйте позже.`);
      } finally {
        setLoading(false);
      }
    };

    loadPairs();
  }, [onPairChange, selectedPair, isFuture]);

  // Закрытие выпадающего списка при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handlePairChange = (pair: string) => {
    setSelectedPair(pair);
    onPairChange(pair);
    setIsOpen(false);
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const filteredPairs = pairs.filter(pair => 
    pair.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`pair-selector ${isOpen ? 'open' : ''}`} ref={dropdownRef}>
      <div className="selected-pair" onClick={toggleDropdown}>
        {selectedPair}
      </div>
      
      <div className="pairs-dropdown">
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Поиск..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        
        {loading ? (
          <div className="loading-message">Загрузка пар...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : (
          <div className="pairs-list">
            {filteredPairs.map((pair) => (
              <div
                key={pair}
                className={`pair-item ${pair === selectedPair ? 'selected' : ''}`}
                onClick={() => handlePairChange(pair)}
              >
                {pair}
              </div>
            ))}
            {filteredPairs.length === 0 && (
              <div className="no-results">Нет результатов</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PairSelector;
