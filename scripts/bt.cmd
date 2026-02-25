@echo off
REM Binance Ticker 快捷启动脚本 (Windows)

setlocal
set HTTPS_PROXY=http://127.0.0.1:7897
node "%~dp0binance-ticker.js" %*
