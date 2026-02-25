# Binance Skill for Claude Code

获取 Binance 虚拟货币实时价格和历史 K线数据的 Claude Code 技能。

## 快速安装

### 使用 OpenSkills（推荐）

```bash
npx openskills install your-username/binance-skill
```

### 手动安装

```bash
# 1. 克隆仓库
git clone https://github.com/your-username/binance-skill.git ~/.claude/skills/binance

# 2. 安装依赖
cd ~/.claude/skills/binance
npm install node-fetch https-proxy-agent

# 3. 重启 Claude Code
```

## 使用方式

### 在 Claude Code 中（推荐）

安装后，直接使用自然语言：

```
查一下 BTC 的价格
获取 ETH 最近 24 小时的 1 小时 K线
列出热门的交易对
```

### 命令行使用

```bash
# 进入技能目录
cd ~/.claude/skills/binance

# 获取 BTC 价格
node scripts/binance-ticker.js BTC

# 获取多个币种
node scripts/binance-ticker.js BTC ETH SOL

# 获取 K线数据
node scripts/binance-ticker.js --klines ETH -i 1h -n 24

# 列出热门交易对
node scripts/binance-ticker.js --list
```

## 功能

- 实时获取虚拟货币价格
- 获取历史 K线数据（支持多种时间间隔）
- 列出热门交易对

## K线间隔

| 间隔 | 说明 | 1天对应根数 |
|------|------|-------------|
| 1m, 3m, 5m | 分钟 | 1440 / 288 |
| 15m, 30m | 分钟 | 96 / 48 |
| 1h, 2h, 4h, 6h, 8h, 12h | 小时 | 24 / 12 / 6 / 4 / 3 / 2 |
| 1d, 3d | 天 | 1 |
| 1w, 1M | 周/月 | - |

## 代理设置

```bash
export HTTPS_PROXY=http://127.0.0.1:7897
```

## 发布到 GitHub

1. 在 GitHub 创建新仓库 `binance-skill`
2. 将项目推送到 GitHub：

```bash
cd /path/to/binance
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/your-username/binance-skill.git
git push -u origin main
```

3. 其他人就可以通过以下命令安装：

```bash
npx openskills install your-username/binance-skill
```

## 项目结构

```
binance-skill/
├── .claude/
│   └── skills/
│       └── binance/
│           └── SKILL.md          # 技能定义
├── scripts/
│   ├── binance-ticker.js         # 主程序
│   ├── bt                        # Linux/Mac 快捷命令
│   └── bt.cmd                    # Windows 快捷命令
├── README.md                     # 说明文档
├── LICENSE.txt                   # 许可证
└── .gitignore
```

## License

MIT
