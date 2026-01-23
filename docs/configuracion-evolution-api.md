# Configuración de Evolution API

## Instalación con Docker

### 1. Crear archivo docker-compose.yml

```yaml
version: '3.8'

services:
  evolution-api:
    image: atendai/evolution-api:v1.8.4
    container_name: evolution_api
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      - AUTHENTICATION_API_KEY=MiClaveSecreta123
    volumes:
      - evolution_instances:/evolution/instances
      - evolution_store:/evolution/store

volumes:
  evolution_instances:
  evolution_store:
```

### 2. Iniciar el servicio

```bash
docker-compose up -d
```

### 3. Verificar que está corriendo

```bash
docker ps
```

## Crear Instancia de WhatsApp

### 1. Crear instancia

```bash
curl -X POST "http://localhost:8080/instance/create" \
  -H "Content-Type: application/json" \
  -H "apikey: MiClaveSecreta123" \
  -d '{"instanceName": "mi_empresa", "qrcode": true}'
```

### 2. Escanear código QR

Abre http://localhost:8080/manager en tu navegador y escanea el código QR con WhatsApp.

### 3. Verificar conexión

```bash
curl -X GET "http://localhost:8080/instance/connectionState/mi_empresa" \
  -H "apikey: MiClaveSecreta123"
```

Respuesta esperada:
```json
{"instance":{"instanceName":"mi_empresa","state":"open"}}
```

## Configurar Webhook

Para recibir mensajes entrantes en n8n:

```bash
curl -X POST "http://localhost:8080/webhook/set/mi_empresa" \
  -H "Content-Type: application/json" \
  -H "apikey: MiClaveSecreta123" \
  -d '{
    "url": "http://host.docker.internal:5678/webhook/whatsapp-incoming",
    "enabled": true,
    "events": ["MESSAGES_UPSERT"]
  }'
```

### Verificar webhook

```bash
curl -X GET "http://localhost:8080/webhook/find/mi_empresa" \
  -H "apikey: MiClaveSecreta123"
```

## Enviar Mensajes

### Mensaje de texto simple

```bash
curl -X POST "http://localhost:8080/message/sendText/mi_empresa" \
  -H "Content-Type: application/json" \
  -H "apikey: MiClaveSecreta123" \
  -d '{
    "number": "573174426388",
    "textMessage": {
      "text": "Hola, este es un mensaje de prueba!"
    }
  }'
```

## Solución de Problemas

### Error: Container en estado "Restarting"

Usar la versión v1.8.4 sin MongoDB:

```yaml
image: atendai/evolution-api:v1.8.4
```

### Error: 404 en webhook

1. Verificar que el workflow de n8n está **activo**
2. Verificar que la URL del webhook es correcta (sin `-test`)
3. Desactivar y reactivar el workflow

### Error: No se reciben mensajes

1. Verificar que ngrok está corriendo
2. Verificar que el webhook está configurado correctamente
3. Revisar los logs: `docker logs evolution_api --tail 50`
