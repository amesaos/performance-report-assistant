# Configuración de n8n

## Instalación con Docker

```bash
docker run -d --name n8n \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  --add-host=host.docker.internal:host-gateway \
  n8nio/n8n
```

Accede a n8n en: http://localhost:5678

## Workflow 1: Reportes Semanales

### Estructura del Flujo

```
Schedule Trigger → Get row(s) → Loop Over Items → Code → HTTP Request → Wait
                                      ↑____________________________________________|
```

### Nodos

#### 1. Schedule Trigger
- **Trigger Interval:** Weeks
- **Weeks Between Triggers:** 1
- **Trigger on Weekdays:** Friday
- **Trigger at Hour:** 12 (noon)

#### 2. Get row(s) (Data Table)
- **Resource:** Row
- **Operation:** Get
- **Data Table:** Directorio

#### 3. Loop Over Items
- **Batch Size:** 1

#### 4. Code in JavaScript
Copia el código de `workflows/reportes-semanales.js`

#### 5. HTTP Request (WhatsApp)
- **Method:** POST
- **URL:** `https://[tu-ngrok-url]/message/sendText/mi_empresa`
- **Headers:**
  - `Content-Type`: `application/json`
  - `apikey`: `MiClaveSecreta123`
- **Body Content Type:** JSON
- **Specify Body:** Using Fields Below
  - `number`: `{{ $json.telefono }}`
  - `textMessage.text`: `{{ $json.mensaje }}`

#### 6. Wait
- **Resume:** After Time Interval
- **Wait Amount:** 2
- **Wait Unit:** Seconds

## Workflow 2: AI Responder

### Estructura del Flujo

```
Webhook → Code → OpenAI → HTTP Request (WhatsApp) → HTTP Request (Slack)
```

### Nodos

#### 1. Webhook
- **HTTP Method:** POST
- **Path:** `whatsapp-incoming`

#### 2. Code in JavaScript1
Copia el código de `workflows/ai-responder.js`

#### 3. OpenAI (Message a Model)
- **Model:** gpt-4o-mini
- **Messages:**
  - Type: Text, Role: System, Prompt: [Tu prompt de sistema]
  - Type: Text, Role: User, Prompt: `{{ $json.mensaje }}`

#### 4. HTTP Request1 (WhatsApp)
- **Method:** POST
- **URL:** `https://[tu-ngrok-url]/message/sendText/mi_empresa`
- **Headers:**
  - `Content-Type`: `application/json`
  - `apikey`: `MiClaveSecreta123`
- **Body:**
  - `number`: `{{ $('Code in JavaScript1').item.json.telefono }}`
  - `textMessage.text`: `{{ $json.output[0].content[0].text }}`

#### 5. HTTP Request2 (Slack)
- **Method:** POST
- **URL:** `https://hooks.slack.com/services/[tu-webhook-url]`
- **Body Content Type:** JSON
- **Body:**
```json
{
  "text": "🔔 Nuevo mensaje de WhatsApp\n\n👤 Cliente: {{ $('Code in JavaScript1').item.json.nombre }}\n📱 Teléfono: {{ $('Code in JavaScript1').item.json.telefono }}\n\n💬 Mensaje: {{ $('Code in JavaScript1').item.json.mensaje }}\n\n🤖 Respuesta AI: {{ $('Message a model').item.json.output[0].content[0].text }}"
}
```

## Data Table: Directorio

### Columnas

| Columna | Tipo | Descripción |
|---------|------|-------------|
| enterprise_id | String | ID único del cliente en Metabase |
| Telefono | String | Número de WhatsApp (formato: 57XXXXXXXXXX) |
| nombre_empresa | String | Nombre del cliente (usa _ en vez de espacios) |

### Ejemplo

| enterprise_id | Telefono | nombre_empresa |
|---------------|----------|----------------|
| fe892cb7-22a4-4e35-af20-a3faeb525b61 | 573174426388 | QKapital_Group |
| af9b1dd5-4b60-406b-93d6-ae8a5a25ce39 | 573182601111 | LaHaus_ai |

## Activar Workflows

1. Guarda cada workflow
2. Activa el switch en la esquina superior derecha
3. Verifica que dice "Active" en verde

## Solución de Problemas

### Error: "Unexpected identifier"
- Borra todo el código y vuelve a pegarlo
- Puede haber caracteres ocultos al copiar

### Error: "Referenced node doesn't exist"
- Verifica los nombres de los nodos en las expresiones
- Los nombres deben coincidir exactamente

### Error: "No path back to node"
- Verifica que el nodo está correctamente conectado al flujo
