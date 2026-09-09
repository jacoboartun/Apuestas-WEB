#!/usr/bin/env bash

# Directorio del proyecto
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

# Liberar puerto 8000 si quedó ocupado por una ejecución anterior
fuser -k 8000/tcp &>/dev/null || pkill -f "python3 server.py" &>/dev/null
pkill -f "update_duckdns.sh" &>/dev/null
sleep 1

# Obtener IP local en la red Wi-Fi/LAN
LOCAL_IP=$(hostname -I | awk '{print $1}')

echo "================================================================="
echo "🎮 COOLBET CASINO - SERVIDOR LOCAL & BASE DE DATOS EN LINUX"
echo "================================================================="
echo "📍 Acceso desde ESTA COMPUTADORA:"
echo "   http://localhost:8000"
echo ""
echo "📱 Acceso desde la MISMA RED WI-FI (Celulares/Otros equipos):"
echo "   http://${LOCAL_IP}:8000"
echo ""
echo "🦆 DOMINIO DUCKDNS PERMANENTE:"
echo "   http://coolbet.duckdns.org:8000"
echo "================================================================="
echo ""

# Iniciar actualizador de DuckDNS en segundo plano
./update_duckdns.sh &
DUCK_PID=$!

# Iniciar servidor backend Python en segundo plano
python3 server.py &
SERVER_PID=$!

sleep 1

# Función para limpiar procesos al salir con Ctrl+C
cleanup() {
    echo ""
    echo "Deteniendo servidor y actualizador..."
    kill $SERVER_PID $DUCK_PID 2>/dev/null
    fuser -k 8000/tcp &>/dev/null
    exit 0
}
trap cleanup SIGINT SIGTERM

if [ -f "./cloudflared" ]; then
    # Verificar si cloudflared YA está corriendo y tiene una URL activa guardada
    EXISTING_URL=$(grep -o 'https://[-a-zA-Z0-9]*\.trycloudflare\.com' tunnel_url.log 2>/dev/null | tail -n 1)
    
    if pgrep -f "cloudflared tunnel" &>/dev/null && [ -n "$EXISTING_URL" ]; then
        echo "🌍 Túnel HTTPS ya activo y persistente: $EXISTING_URL"
        PUBLIC_URL="$EXISTING_URL"
    else
        echo "🌍 Iniciando túnel de respaldo HTTPS..."
        pkill -f "cloudflared tunnel" 2>/dev/null
        rm -f tunnel_url.log
        ./cloudflared tunnel --url http://localhost:8000 > tunnel_url.log 2>&1 &

        # Esperar hasta obtener la URL pública
        PUBLIC_URL=""
        for i in {1..12}; do
            sleep 1
            PUBLIC_URL=$(grep -o 'https://[-a-zA-Z0-9]*\.trycloudflare\.com' tunnel_url.log | tail -n 1)
            if [ -n "$PUBLIC_URL" ]; then
                break
            fi
        done
    fi

    # Escribir URLs en public_url.txt
    echo "DOMINIO PERMANENTE: http://coolbet.duckdns.org:8000" > public_url.txt
    if [ -n "$PUBLIC_URL" ]; then
        echo "TÚNEL HTTPS: $PUBLIC_URL" >> public_url.txt
    fi

    echo ""
    echo "================================================================="
    echo "✨ ¡TU CASINO COOLBET YA ESTÁ EN LÍNEA PERMANENTEMENTE!"
    echo "================================================================="
    echo "🦆 DOMINIO FIJO DUCKDNS:"
    echo "   http://coolbet.duckdns.org:8000"
    if [ -n "$PUBLIC_URL" ]; then
        echo ""
        echo "🔒 ENLACE SECURO HTTPS (FIJO):"
        echo "   $PUBLIC_URL"
    fi
    echo "================================================================="
    echo ""

    wait $SERVER_PID
else
    wait $SERVER_PID
fi
