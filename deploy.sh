#!/bin/bash

# Script para construir y desplegar el backend con Docker

# Configuración de variables de entorno (personalizar según entorno)
export MONGODB_URI=mongodb://root:b440084ce208222cc885@easypanel.bayreshub.com:27017/?tls=false
export JWT_SECRET=miclavesecretsegura

# Verificar si MongoDB está en ejecución
echo "Verificando MongoDB..."
if ! docker ps | grep -q mongodb; then
  echo "MongoDB no está en ejecución. Iniciando servicios..."
else
  echo "MongoDB ya está en ejecución."
fi

# Construir la imagen Docker
echo "Construyendo la imagen Docker del backend..."
docker-compose build

# Iniciar los contenedores
echo "Iniciando los contenedores..."
docker-compose up -d

echo "Despliegue completado. El backend está disponible en https://api.bayreshub.com"
echo "Base de datos MongoDB disponible en localhost:27017" 