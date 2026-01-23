/**
 * Workflow: AI Responder - Filtrar mensajes entrantes
 * 
 * Este código se usa en el nodo "Code in JavaScript1" de n8n
 * Flujo: Webhook → Code → OpenAI → HTTP Request (WhatsApp) → HTTP Request (Slack)
 * 
 * Entrada: Webhook de Evolution API con mensaje entrante
 * Salida: { mensaje, nombre, telefono, empresa }
 */

// Filtrar solo mensajes entrantes (no enviados por nosotros)
const data = $input.first().json;

// Verificar que es un mensaje entrante
const fromMe = data.body?.data?.key?.fromMe;

if (fromMe === true) {
  // Es un mensaje nuestro, ignorar
  return [];
}

// Es un mensaje del cliente, continuar
const mensaje = data.body?.data?.message?.conversation || "";
const nombre = data.body?.data?.pushName || "Cliente";
const lid = data.body?.data?.key?.remoteJid || "";

// 📱 DIRECTORIO: mapea nombre → { telefono, empresa }
// Agrega más clientes aquí
const DIRECTORIO = {
  "Alejandro Mesa Osorio": { telefono: "573174426388", empresa: "QKapital Group" }
  // Agrega más clientes en el formato:
  // "Nombre del Contacto": { telefono: "57XXXXXXXXXX", empresa: "Nombre Empresa" }
};

// Buscar por nombre
const cliente = DIRECTORIO[nombre] || null;

if (!cliente) {
  // Cliente no registrado - ignorar
  return [];
}

return [{
  json: {
    mensaje: mensaje,
    nombre: nombre,
    telefono: cliente.telefono,
    empresa: cliente.empresa
  }
}];
