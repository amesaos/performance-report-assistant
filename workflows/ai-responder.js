// FLUJO: AI Responder con Clasificador LLM
// Webhook -> Get row(s) -> Code -> OpenAI Clasificador -> Parsear -> IF Pregunta
//     -> (true) -> Query Metabase -> OpenAI Responder -> WhatsApp -> Slack
//     -> (false) -> IF Negativo
//         -> (true) -> WhatsApp (disculpa) -> Slack
//         -> (false) -> Slack

// NODO: Code in JavaScript1
const allData = $("Webhook").first().json;
const fromMe = allData.body?.data?.key?.fromMe;
if (fromMe === true) { return []; }

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
  return [{ json: { mensaje, nombre, telefono: "No registrado", empresa: "NO_REGISTRADO", enterpriseId: null, esClienteNuevo: true } }];
}
return [{ json: { mensaje, nombre, telefono: cliente.Telefono, empresa: cliente.nombre_empresa, enterpriseId: cliente.enterprise_id, esClienteNuevo: false } }];

// NODO: OpenAI Clasificador - System Prompt:
// Eres un clasificador de mensajes. Analiza el mensaje y responde SOLO con JSON:
// {"tipo": "pregunta", "sentimiento": "neutro"}
// tipo: "pregunta" si pregunta sobre leads/visitas/datos. "feedback" si da opinion. "otro" si es saludo.
// sentimiento: "positivo", "negativo" o "neutro"

// NODO: Query Metabase Visitas
// Consulta DATASETS.DEVELOPER__SCHEDULED_VISITS filtrando por enterprise_id
// Trae visitas futuras y pasadas (30 dias)

// NODO: OpenAI Responder - System Prompt:
// Eres asistente de LaHaus AI. El usuario es el VENDEDOR, las visitas son con LEADS.
// Cuando menciones info del chat, di "el lead menciono..."
// Nunca digas "no mencionaste" porque el usuario no tuvo esa conversacion.
