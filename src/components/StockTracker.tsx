import React, { useState, useEffect } from 'react';
import { Card, DatePicker, Button, Input, Space, Table, Modal, Tooltip } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import ReactECharts from 'echarts-for-react';


interface StockData {
  date: string;
  stockCode: string;
  stockName: string;
  pricePoints: {
    price1: number;
    price2: number;
  };
  key: string;
  notes?: string;
}

interface CachedData {
  timestamp: number;
  data: any[];
}

const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 缓存24小时

// 保存到本地文件
const saveToLocalFile = (data: StockData[]) => {
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `stock_data_${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// 定时备份


const StockTracker: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [stockData, setStockData] = useState<StockData[]>(() => {
    const savedData = localStorage.getItem('stockTrackerData');
    return savedData ? JSON.parse(savedData) : [];
  });
  const [stockCode, setStockCode] = useState('');
  const [stockName, setStockName] = useState('');
  const [price1, setPrice1] = useState('');
  const [price2, setPrice2] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<any>(null);
  const [selectedPoints, setSelectedPoints] = useState<{[key: string]: boolean}>({});
  const [notes, setNotes] = useState<string>('');
  const [showNotes, setShowNotes] = useState<boolean>(true);
  // 添加备注框位置状态
  const [notesPosition, setNotesPosition] = useState({ top: 10, right: 70 });
  // 添加拖动状态
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

// 导出处理
const handleExportData = () => {
  saveToLocalFile(stockData);
};

// 导入处理
const handleImportData = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e: any) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        setStockData(importedData);
        localStorage.setItem('stockTrackerData', JSON.stringify(importedData));
        
      } catch (error) {
        console.error('文件解析失败:', error);
        alert('文件格式不正确');
      }
    };
    reader.readAsText(file);
  };
  input.click();
};

  const handleDateSelect = (date: any) => {
    setSelectedDate(date ? date.format('YYYY-MM-DD') : '');
  };

  const handleAddStock = () => {
    if (!selectedDate || !stockCode || !stockName || !price1 || !price2) {
      return;
    }
  
    // 验证股票代码格式
    const stockCodePattern = /^\d{6}$/;
    if (!stockCodePattern.test(stockCode)) {
      alert('请输入6位数字的股票代码');
      return;
    }
  
    // 根据股票代码判断交易所并添加后缀
    const formattedStockCode = stockCode + (parseInt(stockCode) >= 600000 ? '.SH' : '.SZ');
  
    const newStock: StockData = {
      date: selectedDate,
      stockCode: formattedStockCode,
      stockName,
      pricePoints: {
        price1: parseFloat(price1),
        price2: parseFloat(price2)
      },
      key: `${selectedDate}-${formattedStockCode}`
    };
  
    const newData = [...stockData, newStock];
    setStockData(newData);
    // 双存储机制
    localStorage.setItem('stockTrackerData', JSON.stringify(newData));

    
    // 获取股票价格信息
    fetchStockPriceInfo(newStock);
    
    setStockCode('');
    setStockName('');
    setPrice1('');
    setPrice2('');
  };

  // 获取股票价格信息的通用函数
  const fetchStockPriceInfo = async (stock: StockData) => {
    try {
      const date = new Date(stock.date);
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(date.getDate() + 1); // 只获取当天数据
      
      const response = await fetch(`http://localhost:5000/api/stock-data?ts_code=${stock.stockCode}&start_date=${startDate.toISOString().split('T')[0]}&end_date=${endDate.toISOString().split('T')[0]}`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.status === 'success' && result.data && result.data.length > 0) {
          const selectedDateStr = stock.date.replace(/-/g, '');
          const selectedDateData = result.data.find((item: any) => item.trade_date === selectedDateStr);
          
          if (selectedDateData) {
            const highPrice = parseFloat(selectedDateData.high);
            const closePrice = parseFloat(selectedDateData.close);
            
            // 不再需要更新股票价格信息
            console.log(`股票 ${stock.stockName} 的价格信息:`, { highPrice, closePrice });
          }
        }
      }
    } catch (error) {
      console.error('获取股票价格信息失败:', error);
    }
  };

  // 获取缓存的数据
  const getCachedData = (cacheKey: string): any[] | null => {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { timestamp, data }: CachedData = JSON.parse(cached);
      // 检查缓存是否过期
      if (Date.now() - timestamp < CACHE_EXPIRY) {
        return data;
      }
      // 缓存过期，删除它
      localStorage.removeItem(cacheKey);
    }
    return null;
  };

  // 设置缓存数据
  const setCachedData = (cacheKey: string, data: any[]) => {
    const cacheData: CachedData = {
      timestamp: Date.now(),
      data
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  };

  const columns: ColumnsType<StockData> = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      sorter: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      defaultSortOrder: 'descend'
    },
    {
      title: '股票代码',
      dataIndex: 'stockCode',
      key: 'stockCode'
    },
    {
      title: '股票名称',
      dataIndex: 'stockName',
      key: 'stockName'
    },
    {
      title: '价格点1',
      dataIndex: ['pricePoints', 'price1'],
      key: 'price1',
      render: (value: number, record: StockData) => (
        <Input
          size="small"
          style={{ width: 80 }}
          value={value.toString()}
          onChange={(e) => {
            const newValue = parseFloat(e.target.value);
            if (!isNaN(newValue)) {
              const newStockData = stockData.map(item => {
                if (item.key === record.key) {
                  return {
                    ...item,
                    pricePoints: {
                      ...item.pricePoints,
                      price1: newValue
                    }
                  };
                }
                return item;
              });
              setStockData(newStockData);
              localStorage.setItem('stockTrackerData', JSON.stringify(newStockData));
            }
          }}
        />
      )
    },
    {
      title: '价格点2',
      dataIndex: ['pricePoints', 'price2'],
      key: 'price2',
      render: (value: number, record: StockData) => (
        <Input
          size="small"
          style={{ width: 80 }}
          value={value.toString()}
          onChange={(e) => {
            const newValue = parseFloat(e.target.value);
            if (!isNaN(newValue)) {
              const newStockData = stockData.map(item => {
                if (item.key === record.key) {
                  return {
                    ...item,
                    pricePoints: {
                      ...item.pricePoints,
                      price2: newValue
                    }
                  };
                }
                return item;
              });
              setStockData(newStockData);
              localStorage.setItem('stockTrackerData', JSON.stringify(newStockData));
            }
          }}
        />
      )
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Tooltip title="删除记录">
          <Button
            danger
            size="small"
            icon={<DeleteOutlined />}
            style={{ padding: '4px 8px' }}
            onClick={() => {
              Modal.confirm({
                title: '确认删除',
                content: `确定要删除 ${record.stockName} 的记录吗？`,
                onOk: () => {
                  const newData = stockData.filter(item => item.key !== record.key);
                  setStockData(newData);
                  localStorage.setItem('stockTrackerData', JSON.stringify(newData));
                }
              });
            }}
          />
        </Tooltip>
      )
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button type="link" onClick={() => handleViewKLine(record)}>查看K线</Button>
      )
    }
  ];

  const handleViewKLine = async (stockData: StockData) => {
    setSelectedStock(stockData);
    setIsModalVisible(true);
    setError(null);
    setNotes(stockData.notes || '');
  };

  const fetchData = async () => {
    if (selectedStock && isModalVisible) {
      setIsLoading(true);
      setError(null);
      try {
        const date = new Date(selectedStock.date);
        const startDate = new Date(date);
        
        // 修改结束日期逻辑，确保不超过当前日期
        const endDate = new Date(date);
        endDate.setDate(date.getDate() + 60);
        
        // 获取当前日期
        const currentDate = new Date();
        // 如果计算的结束日期超过当前日期，则使用当前日期
        if (endDate > currentDate) {
          endDate.setTime(currentDate.getTime());
        }

        // 构建缓存键
        const cacheKey = `stock_data_${selectedStock.stockCode}_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}`;
        
        // 尝试从缓存获取数据
        const cachedData = getCachedData(cacheKey);
        let data;
        
        if (cachedData) {
          console.log('使用缓存的数据');
          data = cachedData;
        } else {
          console.log('从服务器获取数据');
          const response = await fetch(`http://localhost:5000/api/stock-data?ts_code=${selectedStock.stockCode}&start_date=${startDate.toISOString().split('T')[0]}&end_date=${endDate.toISOString().split('T')[0]}`);
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`请求失败 (${response.status}): ${errorText}`);
          }
          
          const result = await response.json();
          if (result.status === 'error') {
            throw new Error(result.message || '获取数据失败');
          }
          
          data = result.data;
          
          // 缓存新获取的数据
          if (data && data.length > 0) {
            setCachedData(cacheKey, data);
          }
        }
        
        if (!data || data.length === 0) {
          throw new Error('未获取到股票数据');
        }

        // 更新股票价格信息
        const selectedDateStr = selectedStock.date.replace(/-/g, '');
        const selectedDateData = data.find((item: any) => item.trade_date === selectedDateStr);
        
        if (selectedDateData) {
          const highPrice = parseFloat(selectedDateData.high);
          const closePrice = parseFloat(selectedDateData.close);
          
          // 不再需要更新股票价格信息
          console.log(`股票 ${selectedStock.stockName} 的价格信息:`, { highPrice, closePrice });
        }

        const dates = data.map((item: any) => item.trade_date);
        const values = data.map((item: any) => [
          parseFloat(item.open),
          parseFloat(item.close),
          parseFloat(item.low),
          parseFloat(item.high)
        ]);

        // 打印数据格式以便调试
        console.log('K线数据格式:', {
          dates: dates.slice(0, 3),
          values: values.slice(0, 3)
        });

        // 找到选定日期在数据中的索引
        const selectedDateIndex = dates.indexOf(selectedDateStr);
        
        // 找到起始日的次日索引
        const nextDayIndex = selectedDateIndex + 1;

        const option = {
          title: {
            text: `${selectedStock.stockName} (${selectedStock.stockCode})`,
            left: 'center'
          },
          tooltip: {
            trigger: 'axis',
            axisPointer: {
              type: 'cross'
            },
            formatter: function (params: any) {
              // 打印完整的params对象，用于调试
              console.log('完整的tooltip参数:', JSON.stringify(params, null, 2));
              
              if (!Array.isArray(params) || params.length === 0) {
                return '';
              }
              
              // 获取当前悬停的日期
              const date = params[0].axisValue;
              
              // 尝试找到K线数据
              let kLineData = null;
              for (const param of params) {
                console.log(`系列 ${param.seriesName} 的数据:`, param);
                if (param.seriesName === 'K线') {
                  kLineData = param;
                  break;
                }
              }
              
              if (!kLineData) {
                console.error('找不到K线数据');
                return '';
              }
              
              // ECharts的K线图数据格式是 [open, close, low, high]
              // 但在tooltip中，value的格式是 [x轴坐标, open, close, low, high]
              const openPrice = kLineData.value[1]; // 开盘价
              const closePrice = kLineData.value[2]; // 收盘价
              const lowPrice = kLineData.value[3]; // 最低价
              const highPrice = kLineData.value[4]; // 最高价
              
              console.log('提取的价格数据:', {
                open: openPrice,
                close: closePrice,
                low: lowPrice,
                high: highPrice
              });
              
              // 计算涨幅
              const highPriceGain = ((highPrice - selectedStock.pricePoints.price2) / selectedStock.pricePoints.price2 * 100).toFixed(2);
              const closePriceGain = ((closePrice - selectedStock.pricePoints.price2) / selectedStock.pricePoints.price2 * 100).toFixed(2);
              
              // 构建提示内容
              let result = `<div style="font-weight:bold;margin-bottom:5px;">${date}</div>`;
              
              // 添加K线数据
              result += `<div>开盘价: ${openPrice.toFixed(2)}</div>`;
              result += `<div>收盘价: ${closePrice.toFixed(2)}</div>`;
              result += `<div>最低价: ${lowPrice.toFixed(2)}</div>`;
              result += `<div>最高价: ${highPrice.toFixed(2)}</div>`;
              
              // 添加价格点信息
              result += `<div style="margin-top:5px;color:#2196F3;">价格点1: ${selectedStock.pricePoints.price1.toFixed(2)}</div>`;
              result += `<div style="color:#4CAF50;">价格点2: ${selectedStock.pricePoints.price2.toFixed(2)}</div>`;
              
              // 添加涨幅信息
              const highPriceColor = parseFloat(highPriceGain) >= 0 ? 'red' : 'green';
              const closePriceColor = parseFloat(closePriceGain) >= 0 ? 'red' : 'green';
              
              result += `<div style="margin-top:5px;">最高价涨幅: <span style="color:${highPriceColor}">${highPriceGain}%</span></div>`;
              result += `<div>收盘价涨幅: <span style="color:${closePriceColor}">${closePriceGain}%</span></div>`;
              
              return result;
            }
          },
          legend: {
            data: ['K线', '价格点1', '价格点2', '1%位置'],
            top: '30'
          },
          grid: {
            left: '10%',
            right: '10%',
            bottom: '15%'
          },
          xAxis: {
            type: 'category',
            data: dates,
            scale: true,
            boundaryGap: false,
            axisLine: { onZero: false },
            splitLine: { show: false },
            min: 'dataMin',
            max: 'dataMax'
          },
          yAxis: {
            scale: true,
            splitLine: { show: true }
          },
          dataZoom: [
            {
              type: 'inside',
              start: 0,
              end: 100
            },
            {
              show: true,
              type: 'slider',
              bottom: '5%',
              start: 0,
              end: 100
            }
          ],
          series: [
            {
              name: 'K线',
              type: 'candlestick',
              data: values,
              itemStyle: {
                color: 'transparent',    // 阴柱填充透明
                color0: '#006400',      // 阳柱填充深绿色
                borderColor: '#ff0000', // 阳柱边框红色
                borderColor0: '#006400',// 阴柱边框深绿色
                borderWidth: 2          // 加粗边框
              }
            },
            {
              name: '价格点1',
              type: 'scatter',
              symbolSize: 8,
              label: {
                show: true,
                formatter: '{@[1]}',
                position: 'right',
                offset: [5, 0],
                color: '#2196F3',
                fontSize: 14,
                fontWeight: 'bold'
              },
              data: selectedDateIndex >= 0 ? [
                {
                  value: [selectedDateStr, selectedStock.pricePoints.price1],
                  itemStyle: { color: '#2196F3' }
                }
              ] : [],
            },
            {
              name: '价格点2',
              type: 'scatter',
              symbolSize: 8,
              label: {
                show: true,
                formatter: '{@[1]}',
                position: 'right',
                offset: [5, 0],
                color: '#4CAF50',
                fontSize: 14,
                fontWeight: 'bold'
              },
              data: selectedDateIndex >= 0 ? [
                {
                  value: [selectedDateStr, selectedStock.pricePoints.price2],
                  itemStyle: { color: '#4CAF50' }
                }
              ] : [],
            },
            {
              name: '1%位置',
              type: 'scatter',
              symbolSize: 8,
              symbol: 'diamond',
              label: {
                show: true,
                formatter: (params: any) => params.value[1].toFixed(3),
                position: 'right',
                offset: [5, 0],
                color: '#1E90FF',
                fontSize: 14,
                fontWeight: 'bold'
              },
              data: nextDayIndex < dates.length ? [
                {
                  value: [dates[nextDayIndex], Number((selectedStock.pricePoints.price2 * 1.01).toFixed(3))], // 确保计算精度
                  itemStyle: { 
                    color: values[nextDayIndex][1] >= selectedStock.pricePoints.price2 * 1.01 ? '#1E90FF' : '#A0A0A0'
                  }
                }
              ] : [],
            },
            {
              name: '最高价标记',
              type: 'scatter',
              symbolSize: 8,
              symbol: 'circle',
              label: {
                show: true,
                formatter: (params: any) => params.value[1].toFixed(2),
                position: 'top',
                color: '#FF5722',
                fontSize: 14,
                fontWeight: 'bold'
              },
              data: Object.keys(selectedPoints).map(date => {
                const index = dates.indexOf(date);
                if (index >= 0) {
                  return {
                    value: [date, values[index][3]], // 最高价
                    itemStyle: { color: '#FF5722' }
                  };
                }
                return null;
              }).filter(Boolean)
            }
          ]
        };

        setChartData(option);
        setError(null);
      } catch (error: any) {
        console.error('获取股票数据失败:', error);
        setError(error.message || '未知错误');
        setChartData(null);
      } finally {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (isModalVisible && selectedStock) {
      fetchData();
    }
    return () => {
      setChartData(null);
      setError(null);
    };
  }, [isModalVisible, selectedStock, selectedPoints]);

  const handleModalClose = () => {
    saveNotes();
    setIsModalVisible(false);
    setSelectedStock(null);
    setChartData(null);
    setSelectedPoints({}); // 清除所有选中的点
    // 重置备注框位置
    setNotesPosition({ top: 10, right: 70 });
  };

  // 添加刷新数据的函数
  const handleRefreshData = () => {
    // 清除缓存中的数据，强制重新获取
    if (selectedStock) {
      const date = new Date(selectedStock.date);
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(date.getDate() + 60);
      
      // 获取当前日期
      const currentDate = new Date();
      // 如果计算的结束日期超过当前日期，则使用当前日期
      if (endDate > currentDate) {
        endDate.setTime(currentDate.getTime());
      }

      // 构建缓存键
      const cacheKey = `stock_data_${selectedStock.stockCode}_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}`;
      
      // 删除缓存
      localStorage.removeItem(cacheKey);
      
      // 重新获取数据
      fetchData();
    }
  };

  const handleChartClick = (params: any) => {
    if (params.componentType === 'series' && params.seriesName === 'K线') {
      const date = params.name;
      setSelectedPoints(prev => {
        const newPoints = {...prev};
        if (newPoints[date]) {
          delete newPoints[date];
        } else {
          newPoints[date] = true;
        }
        return newPoints;
      });
      
      // 手动触发重新获取数据以更新图表
      fetchData();
    }
  };

  const saveNotes = () => {
    if (selectedStock) {
      const newStockData = stockData.map(item => {
        if (item.key === selectedStock.key) {
          return {
            ...item,
            notes: notes
          };
        }
        return item;
      });
      
      setStockData(newStockData);
      localStorage.setItem('stockTrackerData', JSON.stringify(newStockData));
      
      setSelectedStock({
        ...selectedStock,
        notes: notes
      });
    }
  };

  // 添加拖动开始处理函数
  const handleDragStart = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  // 添加拖动处理函数
  const handleDrag = (e: React.MouseEvent) => {
    if (isDragging) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      
      // 更新位置（注意：right值需要反向计算）
      setNotesPosition(prev => ({
        top: prev.top + deltaY,
        right: prev.right - deltaX
      }));
      
      // 更新拖动起始点
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  // 添加拖动结束处理函数
  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // 添加鼠标移出处理函数
  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
    }
  };

  return (
    <Card title="股票追踪">
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space>
          <DatePicker onChange={handleDateSelect} />
          <Input
            placeholder="股票代码"
            value={stockCode}
            onChange={(e) => setStockCode(e.target.value)}
            style={{ width: 120 }}
          />
          <Input
            placeholder="股票名称"
            value={stockName}
            onChange={(e) => setStockName(e.target.value)}
            style={{ width: 120 }}
          />
          <Input
            placeholder="价格点1"
            value={price1}
            onChange={(e) => setPrice1(e.target.value)}
            style={{ width: 120 }}
          />
          <Input
            placeholder="价格点2"
            value={price2}
            onChange={(e) => setPrice2(e.target.value)}
            style={{ width: 120 }}
          />
          <Button type="primary" onClick={handleAddStock}>添加</Button>
        </Space>

        <Table columns={columns} dataSource={stockData} />
        <Space style={{ marginTop: 16 }}>
          <Button onClick={handleExportData}>导出到本地</Button>
          <Button onClick={handleImportData}>导入本地文件</Button>
        </Space>

        <Modal
          title="K线图"
          open={isModalVisible}
          onCancel={handleModalClose}
          width={900}
          style={{ top: 20 }}
          footer={null}
        >
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>加载中...</div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'red' }}>{error}</div>
          ) : chartData ? (
            <div>
              <div 
                style={{ 
                  position: 'absolute', 
                  top: `${notesPosition.top}px`, 
                  right: `${notesPosition.right}px`,
                  zIndex: 100,
                  width: '250px',
                  background: 'rgba(255, 255, 255, 0.9)',
                  padding: '10px',
                  borderRadius: '4px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                  display: showNotes ? 'block' : 'none',
                  cursor: isDragging ? 'grabbing' : 'grab'
                }}
                onMouseDown={handleDragStart}
                onMouseMove={handleDrag}
                onMouseUp={handleDragEnd}
                onMouseLeave={handleMouseLeave}
              >
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  marginBottom: '8px',
                  cursor: 'grab' // 表示可拖动
                }}>
                  <span style={{ fontWeight: 'bold' }}>备注</span>
                  <Button 
                    type="text" 
                    size="small" 
                    onClick={() => setShowNotes(false)}
                    style={{ padding: '0', lineHeight: '1' }}
                  >
                    隐藏
                  </Button>
                </div>
                <Input.TextArea 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={saveNotes}
                  rows={4}
                  placeholder="在此添加备注..."
                  onMouseDown={(e) => e.stopPropagation()} // 防止文本区域的鼠标事件触发拖动
                />
              </div>
              
              <Button 
                type="primary"
                size="small"
                icon={<span role="img" aria-label="reload" className="anticon anticon-reload"><svg viewBox="64 64 896 896" focusable="false" data-icon="reload" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M909.1 209.3l-56.4 44.1C775.8 155.1 656.2 92 521.9 92 290 92 102.3 279.5 102 511.5 101.7 743.7 289.8 932 521.9 932c181.3 0 335.8-115 394.6-276.1 1.5-4.2-.7-8.9-4.9-10.3l-56.7-19.5a8 8 0 00-10.1 4.8c-1.8 5-3.8 10-5.9 14.9-17.3 41-42.1 77.8-73.7 109.4A344.77 344.77 0 01655.9 829c-42.3 17.9-87.4 27-133.8 27-46.5 0-91.5-9.1-133.8-27A341.5 341.5 0 01279 755.2a342.16 342.16 0 01-73.7-109.4c-17.9-42.4-27-87.4-27-133.9s9.1-91.5 27-133.9c17.3-41 42.1-77.8 73.7-109.4 31.6-31.6 68.4-56.4 109.3-73.8 42.3-17.9 87.4-27 133.8-27 46.5 0 91.5 9.1 133.8 27a341.5 341.5 0 01109.3 73.8c9.9 9.9 19.2 20.4 27.8 31.4l-60.2 47a8 8 0 003 14.1l175.6 43c5 1.2 9.9-2.6 9.9-7.7l.8-180.9c-.1-6.6-7.8-10.3-13-6.2z"></path></svg></span>}
                onClick={handleRefreshData}
                title="刷新数据"
                style={{ 
                  position: 'absolute', 
                  top: '10px', 
                  left: '10px',
                  zIndex: 100 
                }}
              />
              
              {!showNotes && (
                <Button 
                  type="primary"
                  size="small"
                  style={{ 
                    position: 'absolute', 
                    top: '50px',
                    right: '70px',
                    zIndex: 100 
                  }}
                  onClick={() => setShowNotes(true)}
                >
                  显示备注
                </Button>
              )}
              
              <ReactECharts
                option={chartData}
                style={{ 
                  height: '540px',
                  marginTop: '10px'
                }}
                opts={{ renderer: 'svg' }}
                onEvents={{
                  'click': handleChartClick
                }}
              />
            </div>
          ) : null}
        </Modal>
      </Space>
    </Card>
  );
};

export default StockTracker;
