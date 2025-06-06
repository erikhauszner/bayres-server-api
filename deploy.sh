#!/bin/bash

# Script para construir y desplegar el backend con Docker

# Configuración de variables de entorno (personalizar según entorno)
export MONGODB_URI=mongodb://mongodb:27017/bayres
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

echo "Despliegue completado. El backend está disponible en http://localhost:3000"
echo "Base de datos MongoDB disponible en localhost:27017" 