// ============================================
// FLUJO: Recordatorio Visitas Agendadas
// ============================================
// Manual Trigger → Get row(s) → Loop Over Items → Code → IF → HTTP Request (WhatsApp) → Wait

// ============================================
// NODO: Code in JavaScript
// ============================================
const METABASE_URL = "https://data.lahaus.com";
const API_KEY = "mb_CxlHNmV001wDN+elMEJ3NTtKsIWKfTEL/AtbaNR0KV0=";

const cliente = $input.first().json;
const enterpriseId = cliente.enterprise_id;
const nombre = cliente.nombre_empresa ? cliente.nombre_empresa.replace(/_/g, ' ') : "Cliente";
const telefono = cliente.Telefono;

if (!enterpriseId) {
  return [{
    json: {
      nombre: nombre,
      telefono: telefono,
      mensaje: "",
      tieneVisitas: false
    }
  }];
}

const hoy = new Date();
const fechaHoy = hoy.toISOString().split('T')[0];

const hace7Dias = new Date(hoy);
hace7Dias.setDate(hace7Dias.getDate() - 7);
const fechaHace7Dias = hace7Dias.toISOString().split('T')[0];

const en4Dias = new Date(hoy);
en4Dias.setDate(en4Dias.getDate() + 4);
const fechaEn4Dias = en4Dias.toISOString().split('T')[0];

const queryFuturas = "SELECT SCHEDULED_AT_LOCAL, CUSTOMER_NAME, CUSTOMER_PHONE FROM DATASETS.DEVELOPER__SCHEDULED_VISITS WHERE ENTERPRISE_ID = '" + enterpriseId + "' AND IS_CUSTOMER_HAUSER = false AND CAST(SCHEDULED_AT_LOCAL AS DATE) >= '" + fechaHoy + "' AND CAST(SCHEDULED_AT_LOCAL AS DATE) <= '" + fechaEn4Dias + "' ORDER BY SCHEDULED_AT_LOCAL ASC LIMIT 20";

const queryPasadas = "SELECT COUNT(*) as total FROM DATASETS.DEVELOPER__SCHEDULED_VISITS WHERE ENTERPRISE_ID = '" + enterpriseId + "' AND IS_CUSTOMER_HAUSER = false AND CAST(SCHEDULED_AT_LOCAL AS DATE) >= '" + fechaHace7Dias + "' AND CAST(SCHEDULED_AT_LOCAL AS DATE) < '" + fechaHoy + "'";

try {
  const responseFuturas = await this.helpers.httpRequest({
    method: 'POST',
    url: METABASE_URL + '/api/dataset',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: {
      database: 3,
      type: "native",
      native: { query: queryFuturas }
    },
    timeout: 60000
  });

  const responsePasadas = await this.helpers.httpRequest({
    method: 'POST',
    url: METABASE_URL + '/api/dataset',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: {
      database: 3,
      type: "native",
      native: { query: queryPasadas }
    },
    timeout: 60000
  });

  const visitasFuturas = responseFuturas.data && responseFuturas.data.rows ? responseFuturas.data.rows : [];
  const visitasPasadasCount = responsePasadas.data && responsePasadas.data.rows && responsePasadas.data.rows[0] ? responsePasadas.data.rows[0][0] : 0;

  if (visitasFuturas.length === 0 && visitasPasadasCount === 0) {
    return [{
      json: {
        nombre: nombre,
        telefono: telefono,
        mensaje: "",
        tieneVisitas: false
      }
    }];
  }

  let mensaje = "Hey " + nombre + "! 👋\n\n";

  if (visitasFuturas.length > 0) {
    mensaje += "Estas son tus proximas visitas:\n\n";
    
    for (let i = 0; i < visitasFuturas.length; i++) {
      const v = visitasFuturas[i];
      const fecha = new Date(v[0]);
      const dia = fecha.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric' });
      const hora = fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
      const nombreLead = v[1] || v[2] || "Sin nombre";
      
      mensaje += "• " + dia + " - " + nombreLead + " (" + hora + ")\n";
    }
  }

  if (visitasPasadasCount > 0) {
    mensaje += "\nEn los ultimos 7 dias tuviste " + visitasPasadasCount + " visita" + (visitasPasadasCount > 1 ? "s" : "") + ". Como te fue? 💬";
  } else if (visitasFuturas.length > 0) {
    mensaje += "\nExitos con tus citas! 🚀";
  }

  return [{
    json: {
      nombre: nombre,
      telefono: telefono,
      mensaje: mensaje,
      tieneVisitas: true
    }
  }];

} catch (error) {
  return [{
    json: {
      nombre: nombre,
      telefono: telefono,
      mensaje: "",
      tieneVisitas: false
    }
  }];
}
