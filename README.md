# 📱 WhatsApp Automation con n8n, Evolution API y Metabase

Sistema automatizado para enviar reportes semanales de performance por WhatsApp y responder automáticamente con un agente de IA.

## 🎯 Funcionalidades

1. **Reportes Semanales Automáticos**: Envía métricas de performance personalizadas a cada cliente
2. **Agente AI Respondedor**: Responde automáticamente cuando un cliente contesta
3. **Notificaciones a Slack**: Alerta cuando un cliente responde
4. **Directorio de Clientes**: Administra clientes desde n8n Data Tables

## 🏗️ Arquitectura

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Schedule      │────▶│   n8n           │────▶│  Evolution API  │
│   Trigger       │     │   Workflow      │     │  (WhatsApp)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │   Metabase      │
                        │   (Datos)       │
                        └─────────────────┘
```

## 📋 Requisitos

- Docker Desktop
- Node.js (opcional, para desarrollo)
- Cuenta de WhatsApp Business
- Acceso a Metabase
- Cuenta de Slack (opcional)

## 🚀 Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/amesaos/whatsapp-automation-n8n.git
cd whatsapp-automation-n8n
```

### 2. Iniciar Evolution API

```bash
cd docker
docker-compose up -d
```

### 3. Iniciar n8n

```bash
docker run -d --name n8n \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  --add-host=host.docker.internal:host-gateway \
  n8nio/n8n
```

### 4. Configurar ngrok (para desarrollo local)

```bash
ngrok http 8080
```

Copia la URL generada (ej: `https://xxxx.ngrok-free.dev`)

### 5. Crear instancia de WhatsApp

```bash
curl -X POST "http://localhost:8080/instance/create" \
  -H "Content-Type: application/json" \
  -H "apikey: MiClaveSecreta123" \
  -d '{"instanceName": "mi_empresa", "qrcode": true}'
```

### 6. Escanear QR

Abre http://localhost:8080/manager y escanea el código QR con WhatsApp

## 📁 Estructura del Proyecto

```
whatsapp-automation-n8n/
├── README.md
├── docker/
│   └── docker-compose.yml
├── workflows/
│   ├── reportes-semanales.js
│   └── ai-responder.js
├── docs/
│   ├── configuracion-evolution-api.md
│   ├── configuracion-n8n.md
│   └── configuracion-metabase.md
└── examples/
    └── mensaje-ejemplo.md
```

## ⚙️ Configuración

### Variables de Entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `METABASE_URL` | URL de Metabase | `https://data.lahaus.com` |
| `METABASE_API_KEY` | API Key de Metabase | `mb_xxx...` |
| `EVOLUTION_API_KEY` | API Key de Evolution | `MiClaveSecreta123` |
| `NGROK_URL` | URL pública de ngrok | `https://xxx.ngrok-free.dev` |

### Promedios de Referencia

Edita estos valores en el código según tus datos históricos:

```javascript
const avg_contactabilidad = 32;    // %
const avg_agendamiento = 7;        // %
const avg_asistente_ai = 22;       // %
const avg_tiempo_respuesta = 6;    // segundos
```

## 📊 Workflows

### 1. Reportes Semanales

**Flujo:**
```
Schedule Trigger → Get row(s) → Loop Over Items → Code → HTTP Request → Wait
```

**Frecuencia:** Viernes a las 12:00 PM

### 2. AI Responder

**Flujo:**
```
Webhook → Code → OpenAI → HTTP Request (WhatsApp) → HTTP Request (Slack)
```

**Trigger:** Mensaje entrante de WhatsApp

## 📱 Ejemplo de Mensaje

```
Hola QKapital Group! 👋

📊 *Reporte Semanal de Performance*
📅 *Período:* 16 de enero al 22 de enero

Esta semana tu operación superó todos los benchmarks. Aquí el resumen clave:

👥 Leads Atendidos: 70 potenciales clientes gestionados.
📅 Visitas Agendadas: 7 citas programadas.

🌙 Atención Fuera de Horario: 12 leads atendidos entre 6pm y 8am. ¡Tu asistente AI trabaja 24/7!

⚡ Tiempo Promedio de Respuesta: 3.9 segundos. En promedio nuestros clientes tuvieron 6s. ¡Atención inmediata! 🚀

🤖 Tu asistente AI agendó al 36% de los leads que respondieron. (En promedio nuestros clientes tuvieron 22%. ¡Estás convirtiendo muchísimo más!)

📊 Comparativo vs Promedio:
✅ Tasa de Agendamiento Global: 10% vs 7% (Promedio)
✅ Contactabilidad: 45% vs 32% (Promedio)

¿Qué opinas de estos resultados? 💬
```

## 🔧 Comandos Útiles

### Verificar estado de WhatsApp
```bash
curl -X GET "http://localhost:8080/instance/connectionState/mi_empresa" \
  -H "apikey: MiClaveSecreta123"
```

### Enviar mensaje de prueba
```bash
curl -X POST "http://localhost:8080/message/sendText/mi_empresa" \
  -H "Content-Type: application/json" \
  -H "apikey: MiClaveSecreta123" \
  -d '{"number": "573174426388", "textMessage": {"text": "Hola, prueba!"}}'
```

### Ver logs de Evolution API
```bash
docker logs evolution_api --tail 50
```

### Configurar webhook
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

## 📝 Notas Importantes

1. **ngrok** debe estar corriendo para que funcione el envío/recepción de WhatsApp
2. Los **workflows deben estar activos** (switch en verde) en n8n
3. Para agregar clientes, edita el **Data Table** "Directorio" en n8n
4. Los mensajes solo muestran métricas donde el cliente supera el promedio

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor, abre un issue primero para discutir los cambios propuestos.

## 📄 Licencia

MIT License
