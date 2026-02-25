---
name: binance
description: 获取 Binance 虚拟货币实时价格、历史 K线数据以及技术指标筛选。当用户查询币价、加密货币价格、BTC/ETH价格、虚拟币行情、超卖/超买币种、技术分析时激活此技能。
---

# Binance 价格查询与筛选技能

## 功能描述

此技能用于从 Binance 获取虚拟货币的实时价格、历史 K线数据，以及基于技术指标筛选符合条件的交易对。

## 使用场景

- 用户查询虚拟货币价格（如 "BTC 价格"、"以太坊多少钱"）
- 用户想获取币种的历史价格数据
- 用户想查看 K线图数据
- 用户想了解热门交易对
- 用户想筛选超卖/超买币种（基于 RSI）
- 用户想筛选技术形态（如金叉、死叉、MACD 交叉等）
- 用户想寻找符合特定技术条件的交易机会

## 安装

此技能需要 node-fetch 和 https-proxy-agent 依赖。

```bash
npm install node-fetch https-proxy-agent
```

## 命令格式

### 查询实时价格
```bash
# 单个币种
node /path/to/binance-ticker.js <symbol>

# 多个币种
node /path/to/binance-ticker.js <symbol1> <symbol2> <symbol3>
```

### 查询 K线数据
```bash
# 基本格式（默认 15分钟线，96根K线=1天）
node /path/to/binance-ticker.js --klines <symbol>

# 指定时间间隔和数量
node /path/to/binance-ticker.js --klines <symbol> -i <interval> -n <count>
```

## 参数说明

| 参数 | 说明 |
|------|------|
| `symbol` | 交易对符号（如：BTC, ETH, SOL），自动添加 USDT 后缀 |
| `-i, --interval` | K线间隔：1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 8h, 12h, 1d, 3d, 1w, 1M |
| `-n, --limit` | K线数量（最大 1000），默认 96 |
| `--klines` | 获取 K线数据 |
| `--list` | 列出热门交易对 |

## K线间隔对照表

| 间隔 | 说明 | 1天对应根数 |
|------|------|-------------|
| 1m | 1分钟 | 1440 |
| 5m | 5分钟 | 288 |
| 15m | 15分钟 | 96 |
| 30m | 30分钟 | 48 |
| 1h | 1小时 | 24 |
| 4h | 4小时 | 6 |
| 1d | 1天 | 1 |

## 示例

```bash
# 获取 BTC 价格
node /path/to/binance-ticker.js BTC

# 获取 BTC 15分钟 K线（1天）
node /path/to/binance-ticker.js --klines BTC -i 15m -n 96

# 获取 ETH 1小时 K线（24小时）
node /path/to/binance-ticker.js --klines ETH -i 1h -n 24

# 获取 SOL 日 K线（1周）
node /path/to/binance-ticker.js --klines SOL -i 1d -n 7

# 列出热门交易对
node /path/to/binance-ticker.js --list
```

## 环境变量

- `HTTPS_PROXY` - 代理地址（默认：http://127.0.0.1:7897）
- `HTTP_PROXY` - 备用代理地址

---

## 技术指标筛选器

### 功能说明

筛选器可以扫描所有 USDT 交易对，根据技术指标筛选符合条件的币种。

### 基本用法

```bash
# 筛选超卖币种（RSI < 30）
node /path/to/binance-screener.js --rsi-below 30

# 筛选 MACD 看涨交叉
node /path/to/binance-screener.js --macd-bullish --interval 4h

# 筛选 MA 金叉
node /path/to/binance-screener.js --ma-golden-cross

# 筛选价格低于布林带下轨
node /path/to/binance-screener.js --bb-below-lower --interval 1h

# 组合筛选：RSI 低于 30 的前 100 高成交量币种
node /path/to/binance-screener.js --rsi-below 30 --top-volume 100
```

### 筛选条件

| 参数 | 说明 |
|------|------|
| `--rsi-below <value>` | RSI 低于指定值（如 30 表示超卖） |
| `--rsi-above <value>` | RSI 高于指定值（如 70 表示超买） |
| `--rsi-between <min,max>` | RSI 在两个值之间（如 40,60） |
| `--macd-bullish` | MACD 看涨交叉（直方图从负变正） |
| `--macd-bearish` | MACD 看跌交叉（直方图从正变负） |
| `--ma-golden-cross` | MA20 上穿 MA50（金叉） |
| `--ma-death-cross` | MA20 下穿 MA50（死叉） |
| `--bb-lower` | 价格触及布林带下轨 |
| `--bb-below-lower` | 价格低于布林带下轨 |
| `--bb-upper` | 价格触及布林带上轨 |
| `--bb-above-upper` | 价格高于布林带上轨 |

### 输出选项

| 参数 | 说明 |
|------|------|
| `-i, --interval` | K线间隔（默认：4h） |
| `-n, --limit` | K线数量（默认：100） |
| `--top-volume <count>` | 仅扫描前 N 个高成交量币种 |
| `--max-results <count>` | 限制结果数量 |
| `-o, --output` | 输出格式：json（默认）、table |
| `--output-file <file>` | 输出到文件 |

### 输出格式

JSON 格式输出（默认）：

```json
{
  "timestamp": "2026-02-25T14:00:00Z",
  "interval": "4h",
  "filters": { "rsi": { "below": 30 } },
  "results": [
    {
      "symbol": "BTCUSDT",
      "price": 95234.50,
      "indicators": {
        "rsi": 28.5,
        "macd": { "value": 123.45, "signal": 118.32, "histogram": 5.13 },
        "ma20": 94800.00,
        "ma50": 94500.00,
        "bollinger": { "upper": 98000, "middle": 95000, "lower": 92000 }
      }
    }
  ],
  "totalScanned": 1523,
  "matchedCount": 42
}
```

### 常见筛选场景

```bash
# 寻找超卖反弹机会
node binance-screener.js --rsi-below 30 --bb-below-lower --interval 4h

# 寻找趋势启动机会
node binance-screener.js --ma-golden-cross --rsi-between 40,60 --interval 1d

# 寻找动量增强机会
node binance-screener.js --macd-bullish --rsi-above 50 --interval 1h

# 扫描高市值币种
node binance-screener.js --rsi-below 30 --top-volume 50 --interval 4h

# 表格格式输出
node binance-screener.js --rsi-below 30 -o table

# 保存到文件
node binance-screener.js --rsi-below 30 --output-file results.json
```
