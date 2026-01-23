/**
 * Workflow: AI Responder - Filtrar mensajes entrantes
 * 
 * Este código se usa en el nodo "Code in JavaScript1" de n8n
 * Flujo: Webhook → Code → OpenAI → HTTP Request (WhatsApp) → HTTP Request (Slack)
 * 
 * Entrada: Webhook de Evolution API con mensaje entrante
 * Salida: { mensaje, nombre, telefono }
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

// 📱 DIRECTORIO: mapea nombre → teléfono
// Agrega más clientes aquí
const DIRECTORIO = {
  "Alejandro Mesa Osorio": "573174426388"
  // Agrega más clientes en el formato:
  // "Nombre del Cliente": "57XXXXXXXXXX"
};

// Buscar por nombre
const telefono = DIRECTORIO[nombre] || null;

if (!telefono) {
  // Cliente no registrado - ignorar
  return [];
}

return [{
  json: {
    mensaje: mensaje,
    nombre: nombre,
    telefono: telefono
  }
}];
