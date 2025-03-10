from flask import Flask, jsonify, request
from flask_cors import CORS
import tushare as ts
import pandas as pd
from datetime import datetime
import os
from dotenv import load_dotenv
import logging

load_dotenv()

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 初始化Tushare API
pro = ts.pro_api('0298f18fe6343615ea0105dcdce4959938fe83949a20c06dab2c567d')

@app.route('/api/stock-data', methods=['GET'])
def get_stock_data():
    try:
        ts_code = request.args.get('ts_code')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        if not all([ts_code, start_date, end_date]):
            return jsonify({
                'status': 'error',
                'message': '缺少必要参数'
            }), 400

        # 转换日期格式
        start_date = datetime.strptime(start_date, '%Y-%m-%d').strftime('%Y%m%d')
        end_date = datetime.strptime(end_date, '%Y-%m-%d').strftime('%Y%m%d')

        # 获取股票数据
        df = pro.daily(ts_code=ts_code, start_date=start_date, end_date=end_date)
        
        if df.empty:
            return jsonify({
                'status': 'error',
                'message': '未找到股票数据'
            }), 404

        # 按照日期排序
        df = df.sort_values('trade_date')

        # 转换数据为列表
        data = df[['trade_date', 'open', 'high', 'low', 'close', 'vol']].to_dict('records')

        return jsonify({
            'status': 'success',
            'data': data
        })

    except Exception as e:
        logger.error(f'Error fetching stock data: {str(e)}')
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)