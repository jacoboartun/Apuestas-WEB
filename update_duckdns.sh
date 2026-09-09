#!/usr/bin/env bash

# Script de actualización automática para coolbet.duckdns.org
DOMAIN="coolbet"
TOKEN="81935f3a-0774-4063-888f-351c0f8bfe3b"

echo "================================================================="
echo "🦆 DUCKDNS - ACTUALIZADOR AUTOMÁTICO PARA coolbet.duckdns.org"
echo "================================================================="

while true; do
    RESPONSE=$(curl -s "https://www.duckdns.org/update?domains=${DOMAIN}&token=${TOKEN}&ip=")
    if [ "$RESPONSE" = "OK" ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ DuckDNS IP actualizada correctamente a coolbet.duckdns.org"
    else
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️ Respuesta de DuckDNS: ${RESPONSE}"
    fi
    sleep 300
done
