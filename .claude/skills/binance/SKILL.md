---
name: binance
description: 获取 Binance 虚拟货币实时价格和历史 K线数据。当用户查询币价、加密货币价格、BTC/ETH价格、虚拟币行情时激活此技能。
---

# Binance 价格查询技能

## 功能描述

此技能用于从 Binance 获取虚拟货币的实时价格和历史 K线数据。

## 使用场景

- 用户查询虚拟货币价格（如 "BTC 价格"、"以太坊多少钱"）
- 用户想获取币种的历史价格数据
- 用户想查看 K线图数据
- 用户想了解热门交易对

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
