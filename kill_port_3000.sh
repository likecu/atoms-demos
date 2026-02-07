#!/bin/bash

PORT=3000

echo "正在查找端口 $PORT 上的进程..."

PID=$(lsof -ti:$PORT)

if [ -z "$PID" ]; then
    echo "端口 $PORT 上没有运行的进程"
    exit 0
fi

echo "找到进程 PID: $PID"

kill -9 $PID

if [ $? -eq 0 ]; then
    echo "成功杀掉进程 $PID"
else
    echo "杀掉进程失败"
    exit 1
fi

echo "端口 $PORT 已释放"
