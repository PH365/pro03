沪深股市
接口地址：
http://web.juhe.cn/finance/stock/hs
请求方式：http get
返回类型：json
接口描述：数据仅供参考，不作投资使用，每5分钟更新一次；不支持对外展示，只支持自用学习研究。
接口调试： API测试工具
请求Header：

名称	值
 	Content-Type	application/x-www-form-urlencoded
请求参数说明：

名称	必填	类型	说明
 	gid	否	string	股票编号，上海股市以sh开头，深圳股市以sz开头如：sh601009（type为0或者1时gid不传）
 	key	是	String	APP Key
 	type	否	int	0代表上证综合指数，1代表深证成份指数(输入此字段时,gid字段不起作用)
请求代码示例：

curl
PHP
Python
Go
C#
Node
Java
ObjectC
复制代码
curl -k -i "http://web.juhe.cn/finance/stock/hs?key=key&gid=sh601009&type="
返回参数说明：

名称	类型	说明
 	见JSON返回示例	-	-
JSON返回示例：
JSON在线格式化工具 >

      
{
"resultcode":"200", /*返回码，200:正常*/
"reason":"SUCCESSED!",
"result":[
{
    "data":{
 		"gid":"sh601009",				/*股票编号*/
                "increPer": "9.91",                               /*涨跌百分比*/
                "increase": "43.99",                             /*涨跌额*/
		"name":"南京银行",				/*股票名称*/
		"todayStartPri":"8.26",				/*今日开盘价*/
		"yestodEndPri":"8.26",				/*昨日收盘价*/
		"nowPri":"8.37",				/*当前价格*/
		"todayMax":"8.55",				/*今日最高价*/
		"todayMin":"8.25",				/*今日最低价*/
		"competitivePri":"8.37",			/*竞买价*/
		"reservePri":"8.38",				/*竞卖价*/
		"traNumber":"34501453",				/*成交量*/
		"traAmount":"290889560",			/*成交金额*/
		"buyOne":"10870",				/*买一*/
		"buyOnePri":"8.37",				/*买一报价*/
		"buyTwo":"177241",				/*买二*/
		"buyTwoPri":"8.36",				/*买二报价*/
		"buyThree":"92600",				/*买三*/
		"buyThreePri":"8.35",				/*买三报价*/
		"buyFour":"87200"				/*买四*/
		"buyFourPri":"8.34",				/*买四报价*/
		"buyFive":"113700",				/*买五*/
		"buyFivePri":"8.42",				/*买五报价*/
		"sellOne":"47556",				/*卖一*/
		"sellOnePri":"8.38",				/*卖一报价*/
		"sellTwo":"103057",				/*卖二*/
		"sellTwoPri":"8.39",				/*卖二报价*/
		"sellThree":"186689",				/*卖三*/
		"sellThreePri":"8.40",				/*卖三报价*/
		"sellFour":"49000",				/*卖四*/
		"sellFourPri":"8.41",				/*卖四报价*/		
		"sellFive":"214535",				/*卖五*/
		"sellFivePri":"15.21",				/*卖五报价*/
		"date":"2012-12-11",				/*日期*/
		"time":"15:03:06",				/*时间*/
    },
"dapandata":{
				"dot":"7.690",/*当前价格*/
				"name":"南京银行",
				"nowPic":"-0.070",/*涨量*/
				"rate":"-0.90",/*涨幅(%)*/
				"traAmount":"17265",/*成交额(万)*/
				"traNumber":"223355"/*成交量*/
			},
    "gopicture":{
		
	"minurl":"http://image.sinajs.cn/newchart/min/n/sh601009.gif",/*分时K线图*/
        "dayurl":"http://image.sinajs.cn/newchart/daily/n/sh601009.gif",/*日K线图*/
        "weekurl":"http://image.sinajs.cn/newchart/weekly/n/sh601009.gif",/*周K线图*/
        "monthurl":"http://image.sinajs.cn/newchart/monthly/n/sh601009.gif"/*月K线图*/
    }
}]
}
----------------------------------深（上）证指数示例------------------------------------------------------------------
{
    "error_code": 0
    "reason": "SUCCESSED!",
    "result": {
        "dealNum": "24388041799",/*成交量(手)*/
        "dealPri": "340674441059.270",/*成交额*/
        "highPri": "10357.417",/*最高*/
        "increPer": "-0.46",/*涨跌百分比*/
         "increase": "-43.756",/*涨跌幅*/
        "lowpri": "10121.741",/*最低*/
        "name": "深证成指",/*名称*/
        "nowpri": "10270.855",/*当前价格*/
        "openPri": "10200.547",/*今开*/
        "time": "2015-09-22 14:45:25",/*时间*/
        "yesPri": "10176.727"/*昨收*/
    },
}