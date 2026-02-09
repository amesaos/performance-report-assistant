// ============================================
// FLUJO: Solicitud de Feedback
// ============================================
// Manual Trigger → Get row(s) → Loop Over Items → Code → HTTP Request (WhatsApp) → Wait

// ============================================
// NODO: Code in JavaScript
// ============================================
const cliente = $input.first().json;
const nombre = cliente.nombre_empresa ? cliente.nombre_empresa.replace(/_/g, ' ') : "Cliente";
const telefono = cliente.Telefono;

const mensaje = "Hola, como estas? 👋\n\nMe encantaria saber como te sientes con el servicio de LaHaus AI y como tu asistente te ha ayudado en la atencion de leads 💬";

return [{
  json: {
    nombre: nombre,
    telefono: telefono,
    mensaje: mensaje
  }
}];
