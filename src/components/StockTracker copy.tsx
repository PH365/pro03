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
      key: 'date'
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
  };

  const fetchData = async () => {
    if (selectedStock && isModalVisible) {
      setIsLoading(true);
      setError(null);
      try {
        const date = new Date(selectedStock.date);
        const startDate = new Date(date);
        const endDate = new Date(date);
        endDate.setDate(date.getDate() + 60);

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
                color: '#2196F3'
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
                color: '#4CAF50'
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
                formatter: (params: any) => params.value[1].toFixed(3), // 修改为3位小数
                position: 'right',
                offset: [5, 0],
                color: '#1E90FF'
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
                color: '#FF5722'
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
    setIsModalVisible(false);
    setSelectedStock(null);
    setChartData(null);
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
          width={1000}
          footer={null}
        >
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>加载中...</div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'red' }}>{error}</div>
          ) : chartData ? (
            <ReactECharts
              option={chartData}
              style={{ height: '600px' }}
              opts={{ renderer: 'svg' }}
              onEvents={{
                'click': handleChartClick
              }}
            />
          ) : null}
        </Modal>
      </Space>
    </Card>
  );
};

export default StockTracker;
