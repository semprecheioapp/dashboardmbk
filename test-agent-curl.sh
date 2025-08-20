#!/bin/bash

# Script para testar a função agent-invite-create-with-password via cURL

# Substitua com suas credenciais e URL
SUPABASE_URL="https://mycjqmnvyphnarjoriux.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15Y2pxbW52eXBobmFyam9yaXV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU5ODI3NDAsImV4cCI6MjA1MTU1ODc0MH0.dcZdBntJdpqJx4hQFzYh2wH8V2zX5z4Q7d3K2m1n8p9q"

# Função para obter token de autenticação
get_auth_token() {
    echo "Fazendo login..."
    
    # Substitua com credenciais válidas
    EMAIL="admin@exemplo.com"
    PASSWORD="senha123"
    
    RESPONSE=$(curl -s -X POST \
        "$SUPABASE_URL/auth/v1/token?grant_type=password" \
        -H "apikey: $ANON_KEY" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "'$EMAIL'",
            "password": "'$PASSWORD'"
        }')
    
    TOKEN=$(echo $RESPONSE | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
    
    if [ -z "$TOKEN" ]; then
        echo "Erro ao obter token de autenticação"
        echo "Resposta: $RESPONSE"
        exit 1
    fi
    
    echo "Token obtido com sucesso"
    echo $TOKEN
}

# Função para testar a função Edge
test_create_agent() {
    local token=$1
    
    echo "Testando criação de agente..."
    
    RESPONSE=$(curl -s -X POST \
        "$SUPABASE_URL/functions/v1/agent-invite-create-with-password" \
        -H "Authorization: Bearer $token" \
        -H "apikey: $ANON_KEY" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "novoagente@exemplo.com",
            "name": "Novo Agente",
            "scopes": ["leads.read", "leads.write"],
            "temporary_password": "Teste123!"
        }')
    
    echo "Resposta da função:"
    echo "$RESPONSE" | jq .
}

# Função para testar sem autenticação
test_no_auth() {
    echo "Testando sem autenticação..."
    
    RESPONSE=$(curl -s -X POST \
        "$SUPABASE_URL/functions/v1/agent-invite-create-with-password" \
        -H "apikey: $ANON_KEY" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "teste@exemplo.com",
            "scopes": ["leads.read"]
        }')
    
    echo "Resposta sem autenticação:"
    echo "$RESPONSE" | jq .
}

# Função para testar CORS
test_cors() {
    echo "Testando CORS..."
    
    RESPONSE=$(curl -s -X OPTIONS \
        "$SUPABASE_URL/functions/v1/agent-invite-create-with-password" \
        -H "Origin: http://localhost:5173" \
        -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: Authorization, Content-Type")
    
    echo "Headers CORS:"
    echo "$RESPONSE" | grep -E "(Access-Control-Allow-|Allow)"
}

# Menu principal
case "${1:-all}" in
    "auth")
        TOKEN=$(get_auth_token)
        test_create_agent "$TOKEN"
        ;;
    "noauth")
        test_no_auth
        ;;
    "cors")
        test_cors
        ;;
    "all")
        echo "=== Teste Completo ==="
        echo "1. Testando CORS..."
        test_cors
        echo ""
        echo "2. Testando sem autenticação..."
        test_no_auth
        echo ""
        echo "3. Testando com autenticação..."
        TOKEN=$(get_auth_token)
        if [ $? -eq 0 ]; then
            test_create_agent "$TOKEN"
        fi
        ;;
    *)
        echo "Uso: $0 [auth|noauth|cors|all]"
        echo "  auth   - Testar com autenticação"
        echo "  noauth - Testar sem autenticação"
        echo "  cors   - Testar CORS"
        echo "  all    - Testar tudo (padrão)"
        ;;
esac

echo ""
echo "=== Teste concluído ==="