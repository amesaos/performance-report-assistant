# Performance Report Assistant

Sistema de automatización WhatsApp para LaHaus AI usando n8n, Evolution API y Metabase.

## 🚀 Funcionalidades

### 1. Reportes Semanales de Performance
Envía automáticamente reportes de métricas a cada cliente vía WhatsApp:
- Leads atendidos
- Visitas agendadas
- Atención fuera de horario
- Tiempo promedio de respuesta
- Efectividad del asistente AI

### 2. AI Responder con Clasificador LLM
Responde mensajes de clientes de forma inteligente:
- **Preguntas sobre datos**: Consulta Metabase y responde con información de visitas/leads
- **Feedback negativo**: Responde automáticamente con disculpa y notifica a Slack
- **Otros mensajes**: Solo notifica a Slack sin responder

### 3. Recordatorio de Visitas
Envía recordatorios manuales con:
- Próximas visitas (4 días)
- Resumen de visitas pasadas (7 días)
- Pregunta de seguimiento

### 4. Solicitud de Feedback
Envía mensaje pidiendo opinión sobre el servicio de LaHaus AI.

## 📁 Estructura del Proyecto
```
performance-report-assistant/
├── README.md
├── .gitignore
├── docker/
│   └── docker-compose.yml
├── workflows/
│   ├── reportes-semanales.js
│   ├── ai-responder.js
│   ├── recordatorio-visitas.js
│   └── feedback-request.js
└── docs/
    ├── configuracion-evolution-api.md
    ├── configuracion-n8n.md
    ├── configuracion-metabase.md
    └── system-prompt-ai.md
```

## 🛠️ Tecnologías

- **n8n**: Plataforma de automatización de workflows
- **Evolution API**: API para WhatsApp
- **Metabase**: Consulta de datos de visitas y leads
- **OpenAI GPT-4o-mini**: Clasificación de mensajes y respuestas inteligentes
- **Slack**: Notificaciones al equipo
- **Docker**: Contenedores para Evolution API y n8n
- **ngrok**: Túnel para webhooks

## 📊 Flujos de n8n

### Flujo 1: Reportes Semanales
```
Schedule Trigger → Get row(s) → Loop Over Items → Code (Query Metabase) → Code (Mensaje) → HTTP Request (WhatsApp) → Wait
```

### Flujo 2: AI Responder
```
Webhook → Get row(s) → Code → OpenAI Clasificador → Parsear → IF Pregunta
    → (true) → Query Metabase → OpenAI Responder → WhatsApp → Slack
    → (false) → IF Negativo
        → (true) → WhatsApp (disculpa) → Slack
        → (false) → Slack
```

### Flujo 3: Recordatorio Visitas
```
Manual Trigger → Get row(s) → Loop Over Items → Code (Query Metabase) → IF → HTTP Request (WhatsApp) → Wait
```

### Flujo 4: Solicitud Feedback
```
Manual Trigger → Get row(s) → Loop Over Items → Code → HTTP Request (WhatsApp) → Wait
```

## 🔧 Configuración

1. Ver [configuracion-evolution-api.md](docs/configuracion-evolution-api.md)
2. Ver [configuracion-n8n.md](docs/configuracion-n8n.md)
3. Ver [configuracion-metabase.md](docs/configuracion-metabase.md)

## 📝 Data Tables en n8n

### Directorio
| Campo | Descripción |
|-------|-------------|
| enterprise_id | ID único del cliente en Metabase |
| Telefono | Número de WhatsApp |
| nombre_empresa | Nombre de la empresa |
| nombre_contacto | Nombre en WhatsApp (pushName) |

## 👥 Notificaciones Slack

Las notificaciones etiquetan a:
- @Alejandra Barreto (U05UDSRUBUP)
- @Diana María Ruiz (U019P0S2UKB)

## 📅 Última actualización

Febrero 2026 - Agregado clasificador LLM, integración Metabase para consultas, recordatorio de visitas.
