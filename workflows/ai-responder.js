// ============================================
// FLUJO: AI Responder con Clasificador LLM
// ============================================
// Webhook → Get row(s) → Code → OpenAI Clasificador → Parsear Clasificacion → IF Pregunta
//     → (true) → Query Metabase Visitas → OpenAI Responder → WhatsApp → Slack
//     → (false) → IF esNegativo
//         → (true) → WhatsApp (disculpa) → Slack
//         → (false) → Slack

// ============================================
// NODO: Code in JavaScript1
// ============================================
const allData = $("Webhook").first().json;

const fromMe = allData.body?.data?.key?.fromMe;

if (fromMe === true) {
  return [];
}

const mensaje = allData.body?.data?.message?.conversation || "";
const nombre = allData.body?.data?.pushName || "Cliente";

const directorio = $input.all().map(item => item.json);

const cliente = directorio.find(c => {
  const nombreContacto = c.nombre_contacto ? c.nombre_contacto.toLowerCase().trim() : "";
  const nombreWhatsApp = nombre.toLowerCase().trim();
  
  return nombreContacto === nombreWhatsApp || 
         nombreContacto.includes(nombreWhatsApp) || 
         nombreWhatsApp.includes(nombreContacto);
});

if (!cliente) {
  return [{
    json: {
      mensaje: mensaje,
      nombre: nombre,
      telefono: "No registrado",
      empresa: "NO_REGISTRADO",
      enterpriseId: null,
      esClienteNuevo: true
    }
  }];
}

return [{
  json: {
    mensaje: mensaje,
    nombre: nombre,
    telefono: cliente.Telefono,
    empresa: cliente.nombre_empresa,
    enterpriseId: cliente.enterprise_id,
    esClienteNuevo: false
  }
}];

// ============================================
// NODO: OpenAI Clasificador - System Prompt
// ============================================
/*
Eres un clasificador de mensajes. Analiza el mensaje del usuario y responde SOLO con un JSON asi:

{"tipo": "pregunta", "sentimiento": "neutro"}

Donde:
- tipo: "pregunta" si el usuario pregunta algo sobre leads, visitas, clientes, presupuestos, datos, transcripciones, horarios, etc. "feedback" si da opinion positiva o negativa sobre el servicio. "otro" si es saludo, agradecimiento u otro.
- sentimiento: "positivo", "negativo" o "neutro"

Responde SOLO el JSON, nada mas.
*/

// ============================================
// NODO: Parsear Clasificacion
// ============================================
const input2 = $input.first().json;
const respuestaAI = input2.message?.content || input2.output?.[0]?.content?.[0]?.text || "{}";

let clasificacion;
try {
  clasificacion = JSON.parse(respuestaAI.trim());
} catch (e) {
  clasificacion = { tipo: "otro", sentimiento: "neutro" };
}

const datosCliente = $('Code in JavaScript1').first().json;

return [{
  json: {
    ...datosCliente,
    tipo: clasificacion.tipo,
    sentimiento: clasificacion.sentimiento,
    esPregunta: clasificacion.tipo === "pregunta",
    esNegativo: clasificacion.sentimiento === "negativo"
  }
}];

// ============================================
// NODO: Query Metabase Visitas
// ============================================
const METABASE_URL = "https://data.lahaus.com";
const API_KEY = "mb_CxlHNmV001wDN+elMEJ3NTtKsIWKfTEL/AtbaNR0KV0=";

const datos = $input.first().json;
const enterpriseId = datos.enterpriseId;

if (!enterpriseId) {
  return [{
    json: {
      ...datos,
      visitas: [],
      tieneVisitas: false,
      datosMetabase: "No se encontro el cliente en el directorio"
    }
  }];
}

const hoy = new Date();
const fechaHoy = hoy.toISOString().split('T')[0];

const hace30Dias = new Date(hoy);
hace30Dias.setDate(hace30Dias.getDate() - 30);
const fechaHace30Dias = hace30Dias.toISOString().split('T')[0];

const hace7Dias = new Date(hoy);
hace7Dias.setDate(hace7Dias.getDate() - 7);
const fechaHace7Dias = hace7Dias.toISOString().split('T')[0];

const query = "SELECT SCHEDULED_AT_LOCAL, CUSTOMER_NAME, CUSTOMER_PHONE, CUSTOMER_EMAIL, PROJECT_NAME, CHAT_HISTORY FROM DATASETS.DEVELOPER__SCHEDULED_VISITS WHERE ENTERPRISE_ID = '" + enterpriseId + "' AND IS_CUSTOMER_HAUSER = false AND CAST(SCHEDULED_AT_LOCAL AS DATE) >= '" + fechaHace30Dias + "' ORDER BY SCHEDULED_AT_LOCAL DESC LIMIT 50";

try {
  const response = await this.helpers.httpRequest({
    method: 'POST',
    url: METABASE_URL + '/api/dataset',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: {
      database: 3,
      type: "native",
      native: { query: query }
    },
    timeout: 60000
  });

  const rows = response.data && response.data.rows ? response.data.rows : [];
  
  const visitas = rows.map(row => ({
    fecha: row[0],
    nombre: row[1] || "Sin nombre",
    telefono: row[2] || "Sin telefono",
    email: row[3] || "Sin email",
    proyecto: row[4] || "Sin proyecto",
    chatHistory: row[5] || "Sin transcripcion"
  }));

  const visitasFuturas = visitas.filter(v => new Date(v.fecha) >= new Date(fechaHoy));
  const visitasPasadas = visitas.filter(v => new Date(v.fecha) < new Date(fechaHoy));
  const visitasUltimos7Dias = visitas.filter(v => {
    const fechaVisita = new Date(v.fecha);
    return fechaVisita >= new Date(fechaHace7Dias) && fechaVisita < new Date(fechaHoy);
  });

  let resumenVisitas = "";
  
  resumenVisitas += "RESUMEN: En los ultimos 7 dias el cliente tuvo " + visitasUltimos7Dias.length + " visita" + (visitasUltimos7Dias.length !== 1 ? "s" : "") + ".\n\n";

  if (visitasFuturas.length > 0) {
    resumenVisitas += "VISITAS FUTURAS:\n";
    visitasFuturas.forEach(v => {
      const fecha = new Date(v.fecha);
      const fechaStr = fecha.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
      resumenVisitas += "- Fecha: " + fechaStr + "\n  Nombre: " + v.nombre + "\n  Telefono: " + v.telefono + "\n  Email: " + v.email + "\n  Proyecto: " + v.proyecto + "\n  Chat: " + v.chatHistory.substring(0, 500) + "\n\n";
    });
  } else {
    resumenVisitas += "No hay visitas futuras programadas.\n\n";
  }

  if (visitasPasadas.length > 0) {
    resumenVisitas += "VISITAS PASADAS (ultimos 30 dias):\n";
    visitasPasadas.forEach(v => {
      const fecha = new Date(v.fecha);
      const fechaStr = fecha.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
      resumenVisitas += "- Fecha: " + fechaStr + "\n  Nombre: " + v.nombre + "\n  Telefono: " + v.telefono + "\n  Email: " + v.email + "\n  Proyecto: " + v.proyecto + "\n  Chat: " + v.chatHistory.substring(0, 500) + "\n\n";
    });
  } else {
    resumenVisitas += "No hay visitas pasadas en los ultimos 30 dias.";
  }

  return [{
    json: {
      ...datos,
      visitas: visitas,
      visitasUltimos7Dias: visitasUltimos7Dias.length,
      tieneVisitas: visitas.length > 0,
      datosMetabase: resumenVisitas
    }
  }];

} catch (error) {
  return [{
    json: {
      ...datos,
      visitas: [],
      visitasUltimos7Dias: 0,
      tieneVisitas: false,
      datosMetabase: "Error al consultar: " + error.message
    }
  }];
}

// ============================================
// NODO: OpenAI Responder Pregunta - System Prompt
// ============================================
/*
Eres un asistente de LaHaus AI que ayuda a los clientes (desarrolladores inmobiliarios) a consultar informacion sobre sus visitas agendadas y leads.

El usuario que te escribe es el CLIENTE de LaHaus (un desarrollador/vendedor). Las visitas son con LEADS (personas interesadas en comprar propiedades).

Tienes acceso a los siguientes datos de visitas del cliente:

{{ $json.datosMetabase }}

IMPORTANTE:
- El "Chat" es la conversacion entre el LEAD (comprador potencial) y el asistente AI de LaHaus
- Cuando menciones informacion del chat, di "el lead menciono..." o "en la conversacion con el lead..."
- Nunca digas "no mencionaste" porque el usuario no es quien tuvo esa conversacion
- El usuario es el VENDEDOR que quiere saber informacion sobre sus LEADS

Responde de forma concisa, amigable y directa. Si la informacion que busca esta en el chat history, extraela claramente. Si no encuentras la informacion, dilo amablemente.

Responde en maximo 4-5 oraciones. No uses formato markdown. Usa emojis con moderacion.
*/
