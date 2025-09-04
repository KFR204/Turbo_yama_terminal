import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData as LightweightCandlestickData, LineStyle, PriceLineOptions } from 'lightweight-charts';
import './CryptoChart.css';
import { fetchCandlestickData, CandlestickData as BinanceCandlestickData, createCandlestickWebSocket } from '../../services/binanceService';

interface CryptoChartProps {
  pair: string;
  isFuture: boolean;
}

interface PriceLevel {
  id: string;
  percent: number;
  price: number;
  color: string;
  priceLine: any;
}

// Доступные цвета для уровней
const availableColors = [
  { name: 'Синий', value: '#2196F3' },
  { name: 'Зеленый', value: '#4CAF50' },
  { name: 'Красный', value: '#F44336' },
  { name: 'Оранжевый', value: '#FF9800' },
  { name: 'Фиолетовый', value: '#9C27B0' }
];

const CryptoChart: React.FC<CryptoChartProps> = ({ pair, isFuture }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const [isChartReady, setIsChartReady] = useState<boolean>(false);
  const webSocketRef = useRef<WebSocket | null>(null);
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [interval, setInterval] = useState<string>('1h');
  const [priceLevels, setPriceLevels] = useState<PriceLevel[]>([]);
  const [percentInput, setPercentInput] = useState<string>('5');
  const [selectedColor, setSelectedColor] = useState<string>(availableColors[0].value);

  // Очистка всех уровней цен
  const clearAllPriceLevels = () => {
    if (candlestickSeriesRef.current) {
      priceLevels.forEach(level => {
        if (level.priceLine) {
          candlestickSeriesRef.current?.removePriceLine(level.priceLine);
        }
      });
    }
    setPriceLevels([]);
  };

  // Эффект для создания и настройки графика
  useEffect(() => {
    let chart: IChartApi | null = null;
    let candlestickSeries: ISeriesApi<'Candlestick'> | null = null;

    const initChart = () => {
      if (chartContainerRef.current) {
        // Создаем новый график
        chart = createChart(chartContainerRef.current, {
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
          layout: {
            background: { color: '#1e2126' },
            textColor: '#d1d4dc',
          },
          grid: {
            vertLines: { color: '#2e3238' },
            horzLines: { color: '#2e3238' },
          },
          crosshair: {
            mode: 0, // Режим перекрестия
          },
          rightPriceScale: {
            borderColor: '#2e3238',
          },
          timeScale: {
            borderColor: '#2e3238',
            timeVisible: true,
            secondsVisible: false,
          },
        });

        // Создаем серию свечей
        candlestickSeries = chart.addCandlestickSeries({
          upColor: '#26a69a',
          downColor: '#ef5350',
          borderVisible: false,
          wickUpColor: '#26a69a',
          wickDownColor: '#ef5350',
        });

        // Сохраняем ссылки на график и серию
        chartRef.current = chart;
        candlestickSeriesRef.current = candlestickSeries;
        setIsChartReady(true);
      }
    };

    // Очищаем предыдущий график, если он существует
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      candlestickSeriesRef.current = null;
      setIsChartReady(false);
      setPriceLevels([]);
    }

    // Инициализируем новый график
    initChart();

    // Обработчик изменения размера окна
    const handleResize = () => {
      if (chart && chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    // Функция очистки
    return () => {
      window.removeEventListener('resize', handleResize);
      if (chart) {
        chart.remove();
        chartRef.current = null;
        candlestickSeriesRef.current = null;
      }
    };
  }, [pair]); // Пересоздаем график при изменении пары

  // Эффект для загрузки исторических данных
  useEffect(() => {
    // Функция для загрузки данных
    const loadChartData = async () => {
      if (!isChartReady || !candlestickSeriesRef.current) return;

      try {
        const data = await fetchCandlestickData(pair, interval, isFuture);
        
        // Проверяем, что серия все еще существует
        if (candlestickSeriesRef.current) {
          // Преобразуем данные в формат, который ожидает библиотека
          const formattedData = data.map((item: BinanceCandlestickData) => ({
            time: item.time as any,
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close
          }));
          
          candlestickSeriesRef.current.setData(formattedData);
          
          // Устанавливаем последнюю цену
          if (formattedData.length > 0) {
            setLastPrice(formattedData[formattedData.length - 1].close);
          }
        }
      } catch (error) {
        console.error('Ошибка при загрузке данных графика:', error);
      }
    };

    loadChartData();
  }, [pair, interval, isChartReady]);

  // Эффект для WebSocket соединения
  useEffect(() => {
    if (!isChartReady || !candlestickSeriesRef.current) return;

    // Закрываем предыдущее соединение, если оно существует
    if (webSocketRef.current) {
      webSocketRef.current.close();
      webSocketRef.current = null;
    }

    // Создаем новое WebSocket соединение
    const ws = createCandlestickWebSocket(pair, interval, (candlestick) => {
      if (candlestickSeriesRef.current) {
        // Обновляем последнюю свечу или добавляем новую
        candlestickSeriesRef.current.update({
          time: candlestick.time as any,
          open: candlestick.open,
          high: candlestick.high,
          low: candlestick.low,
          close: candlestick.close
        });
        
        // Обновляем последнюю цену
        setLastPrice(candlestick.close);
        
        // Обновляем уровни цен
        updatePriceLevels(candlestick.close);
      }
    }, isFuture);

    webSocketRef.current = ws;

    // Функция очистки
    return () => {
      if (webSocketRef.current) {
        webSocketRef.current.close();
        webSocketRef.current = null;
      }
    };
  }, [pair, interval, isChartReady]);

  // Эффект для отслеживания изменений lastPrice и обновления уровней цен
  useEffect(() => {
    if (lastPrice && priceLevels.length > 0 && candlestickSeriesRef.current) {
      // Удаляем все существующие линии с графика
      priceLevels.forEach(level => {
        if (level.priceLine && candlestickSeriesRef.current) {
          candlestickSeriesRef.current.removePriceLine(level.priceLine);
        }
      });

      // Создаем новые линии с обновленными ценами относительно текущей цены
      const newLevelsWithLines = priceLevels.map(level => {
        // Вычисляем новую цену на основе процента от текущей цены
        const newPrice = lastPrice * (1 + level.percent / 100);
        
        if (candlestickSeriesRef.current) {
          const priceLine = candlestickSeriesRef.current.createPriceLine({
            price: newPrice,
            color: level.color,
            lineWidth: 2,
            lineStyle: LineStyle.Solid,
            axisLabelVisible: true,
            title: `${level.percent > 0 ? '+' : ''}${level.percent}%`,
          });

          return {
            ...level,
            price: newPrice,
            priceLine
          };
        }
        return level;
      });

      setPriceLevels(newLevelsWithLines);
    }
  }, [lastPrice]);

  // Функция для обновления уровней цен при изменении текущей цены
  const updatePriceLevels = (currentPrice: number) => {
    if (!candlestickSeriesRef.current || priceLevels.length === 0) return;

    // Удаляем все существующие линии с графика
    priceLevels.forEach(level => {
      if (level.priceLine && candlestickSeriesRef.current) {
        candlestickSeriesRef.current.removePriceLine(level.priceLine);
      }
    });

    // Создаем новые линии с обновленными ценами относительно текущей цены
    const newLevelsWithLines = priceLevels.map(level => {
      // Вычисляем новую цену на основе процента от текущей цены
      const newPrice = currentPrice * (1 + level.percent / 100);
      
      if (candlestickSeriesRef.current) {
        const priceLine = candlestickSeriesRef.current.createPriceLine({
          price: newPrice,
          color: level.color,
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: `${level.percent > 0 ? '+' : ''}${level.percent}%`,
        });

        return {
          ...level,
          price: newPrice,
          priceLine
        };
      }
      return level;
    });

    setPriceLevels(newLevelsWithLines);
  };

  // Функция для добавления нового уровня цены
  const addPriceLevel = () => {
    if (!lastPrice || !candlestickSeriesRef.current) return;
    
    const percent = parseFloat(percentInput);
    if (isNaN(percent)) return;
    
    // Проверяем, существует ли уже уровень с таким процентом
    const existingLevel = priceLevels.find(level => level.percent === percent);
    if (existingLevel) {
      // Если уровень с таким процентом уже существует, не добавляем новый
      alert(`Уровень ${percent > 0 ? '+' : ''}${percent}% уже существует`);
      return;
    }
    
    const price = lastPrice * (1 + percent / 100);
    const id = `level-${Date.now()}`;
    
    const priceLine = candlestickSeriesRef.current.createPriceLine({
      price: price,
      color: selectedColor,
      lineWidth: 2,
      lineStyle: LineStyle.Solid,
      axisLabelVisible: true,
      title: `${percent > 0 ? '+' : ''}${percent}%`,
    });
    
    setPriceLevels(prevLevels => [
      ...prevLevels,
      { id, percent, price, color: selectedColor, priceLine }
    ]);
  };

  // Функция для удаления уровня цены
  const removePriceLevel = (id: string) => {
    setPriceLevels(prevLevels => {
      const levelToRemove = prevLevels.find(level => level.id === id);
      if (levelToRemove && levelToRemove.priceLine && candlestickSeriesRef.current) {
        candlestickSeriesRef.current.removePriceLine(levelToRemove.priceLine);
      }
      return prevLevels.filter(level => level.id !== id);
    });
  };

  // Доступные временные интервалы
  const timeIntervals = [
    { label: '1м', value: '1m' },
    { label: '5м', value: '5m' },
    { label: '15м', value: '15m' },
    { label: '30м', value: '30m' },
    { label: '1ч', value: '1h' },
    { label: '4ч', value: '4h' },
    { label: '1д', value: '1d' },
  ];

  // Обработчик изменения интервала
  const handleIntervalChange = (newInterval: string) => {
    setInterval(newInterval);
  };

  return (
    <div className="crypto-chart">
      <div className="chart-header">
        <div className="chart-title">{pair} График</div>
        {lastPrice && <div className="chart-price">Текущая цена: {lastPrice}</div>}
      </div>
      <div className="chart-controls">
        <div className="interval-selector">
          {timeIntervals.map((item) => (
            <button
              key={item.value}
              className={`interval-button ${interval === item.value ? 'active' : ''}`}
              onClick={() => handleIntervalChange(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="price-level-controls">
          <input
            type="text"
            value={percentInput}
            onChange={(e) => setPercentInput(e.target.value)}
            placeholder="% от цены"
            className="percent-input"
          />
          <div className="color-selector">
            {availableColors.map(color => (
              <div 
                key={color.value}
                className={`color-option ${selectedColor === color.value ? 'selected' : ''}`}
                style={{ backgroundColor: color.value }}
                onClick={() => setSelectedColor(color.value)}
                title={color.name}
              />
            ))}
          </div>
          <button onClick={addPriceLevel} className="add-level-button">
            Добавить уровень
          </button>
          {priceLevels.length > 0 && (
            <button onClick={clearAllPriceLevels} className="clear-levels-button">
              Очистить все
            </button>
          )}
        </div>
      </div>
      {priceLevels.length > 0 && (
        <div className="price-levels-list">
          <h4>Активные уровни:</h4>
          <ul>
            {priceLevels.map(level => (
              <li key={level.id} style={{ borderLeft: `4px solid ${level.color}` }}>
                <span className="level-info">
                  {level.percent > 0 ? '+' : ''}{level.percent}% ({level.price.toFixed(2)})
                </span>
                <button onClick={() => removePriceLevel(level.id)} className="remove-level-button">
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="chart-container" ref={chartContainerRef}></div>
    </div>
  );
};

export default CryptoChart;
