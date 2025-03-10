import tushare as ts
import pandas as pd

# 设置Pandas显示选项
pd.set_option('display.max_rows', None)
pd.set_option('display.max_columns', None)
pd.set_option('display.width', None)

# 初始化Tushare API
pro = ts.pro_api('0298f18fe6343615ea0105dcdce4959938fe83949a20c06dab2c567d')

# 获取平安银行的交易数据
df = pro.daily(ts_code='000001.SZ', start_date='20250301', end_date='20250306')

# 按照日期排序
df = df.sort_values('trade_date')

# 显示数据
print('平安银行近期交易数据：')
print('\n交易数据明细：')
print(df[['trade_date', 'open', 'high', 'low', 'close', 'vol']].to_string(index=False))