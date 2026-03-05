#!/bin/bash
# =====================================================
#   OLIMPO PODS IGNITE - INICIAR SERVIDOR
#   Basta dar duplo clique neste arquivo!
# =====================================================

clear

echo ""
echo "══════════════════════════════════════════════════"
echo "   🔥  OLIMPO PODS IGNITE - INICIANDO...  🔥    "
echo "══════════════════════════════════════════════════"
echo ""

# Navegar até a pasta do projeto
cd "$(dirname "$0")"

# Verificar se o Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado!"
    echo ""
    echo "   Instale em: https://nodejs.org"
    echo ""
    echo "Pressione qualquer tecla para fechar..."
    read -n 1
    exit 1
fi

echo "✅ Node.js encontrado: $(node -v)"
echo ""

# Verificar se a porta já está em uso
if lsof -i :3000 &> /dev/null; then
    echo "⚠️  A porta 3000 já está em uso."
    echo "   Encerrando processo anterior..."
    lsof -ti :3000 | xargs kill -9 2>/dev/null
    sleep 1
    echo "✅ Porta liberada!"
fi

echo "🚀 Iniciando servidor..."
echo ""

# Iniciar o servidor Node.js
node server.js
