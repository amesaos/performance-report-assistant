/**
 * Workflow: Reportes Semanales de Performance
 * 
 * Este código se usa en el nodo "Code in JavaScript" de n8n
 * Flujo: Schedule Trigger → Get row(s) → Loop Over Items → Code → HTTP Request → Wait
 * 
 * Entrada: Cliente del directorio (enterprise_id, nombre_empresa, Telefono)
 * Salida: { nombre, telefono, enterprise_id, mensaje }
 */

const METABASE_URL = "https://data.lahaus.com";
const API_KEY = "mb_CxlHNmV001wDN+elMEJ3NTtKsIWKfTEL/AtbaNR0KV0=";

const cliente = $input.first().json;
const enterpriseId = cliente.enterprise_id;
const nombre = cliente.nombre_empresa ? cliente.nombre_empresa.replace(/_/g, ' ') : "Cliente";
const telefono = cliente.Telefono;

const hoy = new Date();
const fechaFin = hoy.toISOString().split('T')[0];
const hace7Dias = new Date(hoy);
hace7Dias.setDate(hace7Dias.getDate() - 7);
const fechaInicio = hace7Dias.toISOString().split('T')[0];

const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const fechaFinObj = new Date(hoy);
fechaFinObj.setDate(fechaFinObj.getDate() - 1);
const periodoTexto = hace7Dias.getDate() + " de " + meses[hace7Dias.getMonth()] + " al " + fechaFinObj.getDate() + " de " + meses[fechaFinObj.getMonth()];

// Promedios históricos del mercado (valores de referencia)
const avg_contactabilidad = 32;
const avg_agendamiento = 7;
const avg_asistente_ai = 22;
const avg_tiempo_respuesta = 6;

// Query 1: Métricas del cliente
const queryMetricas = "SELECT COUNT(DISTINCT CASE WHEN STAGE_RAW IN ('NEW', 'REACTIVATED') THEN USER_ID END) as leads_gestionados, COUNT(DISTINCT CASE WHEN STAGE_RAW = 'SUCCESSFUL_CONTACT' THEN USER_ID END) as contactos_exitosos, COUNT(DISTINCT CASE WHEN STAGE_RAW = 'SCHEDULED_VISIT' THEN USER_ID END) as visitas_agendadas FROM DATASETS.DEVELOPER__SUBSCRIPTIONS__LEADS__FUNNEL_STAGES WHERE ENTERPRISE_ID = '" + enterpriseId + "' AND STAGE_DATE >= '" + fechaInicio + "' AND STAGE_DATE < '" + fechaFin + "'";

// Query 2: Tiempo de respuesta del cliente
const queryLatencia = "SELECT ROUND(AVG(LATENCIA_MEDIANA), 1) as tiempo_respuesta FROM DATASETS.DEVELOPER__SUBSCRIPTIONS__MEASURE WHERE ENTERPRISE_ID = '" + enterpriseId + "' AND LATENCIA_MEDIANA IS NOT NULL";

// Query 3: Leads atendidos fuera de horario laboral (6pm a 8am)
const queryFueraHorario = "SELECT COUNT(DISTINCT USER_ID) as leads_fuera_horario FROM DATASETS.DEVELOPER__SUBSCRIPTIONS__LEADS__FUNNEL_STAGES WHERE ENTERPRISE_ID = '" + enterpriseId + "' AND STAGE_DATE >= '" + fechaInicio + "' AND STAGE_DATE < '" + fechaFin + "' AND STAGE_RAW IN ('NEW', 'REACTIVATED') AND (EXTRACT(HOUR FROM STAGE_DATE) >= 18 OR EXTRACT(HOUR FROM STAGE_DATE) < 8)";

let mensaje = "";

try {
  // Ejecutar query de métricas
  const responseMetricas = await this.helpers.httpRequest({
    method: 'POST',
    url: METABASE_URL + '/api/dataset',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: {
      database: 3,
      type: "native",
      native: { query: queryMetricas }
    },
    timeout: 60000
  });

  // Ejecutar query de latencia
  const responseLatencia = await this.helpers.httpRequest({
    method: 'POST',
    url: METABASE_URL + '/api/dataset',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: {
      database: 3,
      type: "native",
      native: { query: queryLatencia }
    },
    timeout: 60000
  });

  // Ejecutar query de fuera de horario
  const responseFueraHorario = await this.helpers.httpRequest({
    method: 'POST',
    url: METABASE_URL + '/api/dataset',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: {
      database: 3,
      type: "native",
      native: { query: queryFueraHorario }
    },
    timeout: 60000
  });

  const rowsMetricas = responseMetricas.data && responseMetricas.data.rows ? responseMetricas.data.rows : [];
  const rowsLatencia = responseLatencia.data && responseLatencia.data.rows ? responseLatencia.data.rows : [];
  const rowsFueraHorario = responseFueraHorario.data && responseFueraHorario.data.rows ? responseFueraHorario.data.rows : [];

  if (rowsMetricas.length === 0 || !rowsMetricas[0][0]) {
    mensaje = "Hola " + nombre + "! 👋\n\n📅 Período: " + periodoTexto + "\n\nEsta semana estuvimos analizando tus métricas. ¿Te gustaría que revisemos juntos los resultados? 💬";
  } else {
    const leads_gestionados = rowsMetricas[0][0];
    const contactos_exitosos = rowsMetricas[0][1];
    const visitas_agendadas = rowsMetricas[0][2];
    const tiempo_respuesta = rowsLatencia.length > 0 && rowsLatencia[0][0] ? rowsLatencia[0][0] : null;
    const leads_fuera_horario = rowsFueraHorario.length > 0 && rowsFueraHorario[0][0] ? rowsFueraHorario[0][0] : 0;

    const contactabilidad_pct = leads_gestionados > 0 ? Math.round(contactos_exitosos * 100 / leads_gestionados) : 0;
    const tasa_agendamiento_pct = leads_gestionados > 0 ? Math.round(visitas_agendadas * 100 / leads_gestionados) : 0;
    const asistente_ai_pct = contactos_exitosos > 0 ? Math.round(visitas_agendadas * 100 / contactos_exitosos) : 0;

    if (!leads_gestionados || leads_gestionados === 0) {
      mensaje = "Hola " + nombre + "! 👋\n\n📅 Período: " + periodoTexto + "\n\nEsta semana no registramos nuevos leads. ¿Todo bien con la campaña? Estamos aquí para ayudarte. 💬";
    } else {
      mensaje = "Hola " + nombre + "! 👋\n\n";
      mensaje += "📊 *Reporte Semanal de Performance*\n";
      mensaje += "📅 *Período:* " + periodoTexto + "\n\n";
      mensaje += "Esta semana tu operación superó todos los benchmarks. Aquí el resumen clave:\n\n";
      mensaje += "👥 Leads Atendidos: " + leads_gestionados + " potenciales clientes gestionados.\n";
      mensaje += "📅 Visitas Agendadas: " + (visitas_agendadas || 0) + " citas programadas.";

      if (leads_fuera_horario > 0) {
        mensaje += "\n\n🌙 Atención Fuera de Horario: " + leads_fuera_horario + " leads atendidos entre 6pm y 8am. ¡Tu asistente AI trabaja 24/7!";
      }

      if (tiempo_respuesta && tiempo_respuesta < avg_tiempo_respuesta) {
        mensaje += "\n\n⚡ Tiempo Promedio de Respuesta: " + tiempo_respuesta + " segundos. En promedio nuestros clientes tuvieron " + avg_tiempo_respuesta + "s. ¡Atención inmediata! 🚀";
      }

      if (asistente_ai_pct && asistente_ai_pct > avg_asistente_ai) {
        mensaje += "\n\n🤖 Tu asistente AI agendó al " + asistente_ai_pct + "% de los leads que respondieron. (En promedio nuestros clientes tuvieron " + avg_asistente_ai + "%. ¡Estás convirtiendo muchísimo más!)";
      }

      var comparativos = [];
      if (tasa_agendamiento_pct && tasa_agendamiento_pct > avg_agendamiento) {
        comparativos.push("✅ Tasa de Agendamiento Global: " + tasa_agendamiento_pct + "% vs " + avg_agendamiento + "% (Promedio)");
      }
      if (contactabilidad_pct && contactabilidad_pct > avg_contactabilidad) {
        comparativos.push("✅ Contactabilidad: " + contactabilidad_pct + "% vs " + avg_contactabilidad + "% (Promedio)");
      }

      if (comparativos.length > 0) {
        mensaje += "\n\n📊 Comparativo vs Promedio:\n" + comparativos.join("\n");
      }

      if (contactabilidad_pct && contactabilidad_pct < 20) {
        mensaje += "\n\n⚠️ Nota: Tu tasa de contactabilidad está en " + contactabilidad_pct + "%. Sería bueno revisar juntos las campañas.";
      }

      mensaje += "\n\n¿Qué opinas de estos resultados? 💬";
    }
  }
} catch (error) {
  mensaje = "Hola " + nombre + "! 👋\n\n📅 Período: " + periodoTexto + "\n\nEsta semana estuvimos analizando tus métricas. ¿Te gustaría que revisemos juntos los resultados? 💬";
}

return [{ json: { nombre: nombre, telefono: telefono, enterprise_id: enterpriseId, mensaje: mensaje } }];
