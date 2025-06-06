#!/bin/bash

# Script para construir y desplegar el backend con Docker

# Configuración de variables de entorno (personalizar según entorno)
export MONGODB_URI=mongodb://root:0XdJF794RkeDQ8DbQiah7uqqZQAei7JVrYsuKXextWnKy7lqXo7QazEuEjVcbyjR@147.93.36.93:27017/bayres-panel?directConnection=true
export JWT_SECRET=ee5392100b78a16228abdf0bfc473cb987322f326a1e18f00f9be83704e19dc1

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