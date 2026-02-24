import jsPDF from "jspdf";

const USER_KEY = "usuarioConfig_v1";
const DATA_KEY = "miNominaData_v1";

function loadUserData() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY)) || {};
  } catch {
    return {};
  }
}

function loadData() {
  try {
    return JSON.parse(localStorage.getItem(DATA_KEY)) || {};
  } catch {
    return {};
  }
}

export function generarCuentaCobro() {
  const usuario = loadUserData();
  const data = loadData();

  const doc = new jsPDF();

  // ===================== Datos Usuario =====================
  const nombre = usuario.nombreCompleto || "Nombre no definido";
  const correo = usuario.correo || "Correo no definido";
  const cedula = usuario.cedula || "Cédula no definida";
  const usuarioName = usuario.usuario || "";
  const empresa = usuario.empresa || "Empresa no definida";
  const nit = usuario.nit || "NIT no definido";
  const rawConcepto = usuario.concepto;
  let concepto = (rawConcepto || "").toString().trim();
  // Normalizar concepto: usar 'Mesero' por defecto o cuando venga como 'Servicio prestado' u otros valores genéricos
  const lc = concepto.toLowerCase();
  if (!concepto) {
    concepto = "Mesero";
  } else {
    // Capturar variantes comunes: servicio, presta, prestado, prestación, prestados
    if (/servici|presta|prestad|prestaci/.test(lc)) {
      concepto = "Mesero";
    }
  }

  // Log de diagnóstico para ayudar a detectar valores inesperados en localStorage
  try {
    // Usa console.debug para no llenar logs en producción, pero visible en la consola del navegador
    console.debug("generarCuentaCobro - rawConcepto:", rawConcepto, "-> concepto normalizado:", concepto);
  } catch (e) {
    // noop
  }
  const firma = usuario.firma || null;

  // ===================== Fecha =====================
  const hoy = new Date();
  const fechaStr = hoy.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // ===================== Resumen Mes =====================
  const workDays = data.workDays || [];
  const expenses = data.expenses || [];

  const ingresos = workDays.reduce((acc, d) => acc + (d.value || 0), 0);
  const gastos = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  const balance = ingresos - gastos;

  // ===================== Formato =====================
  let formato = usuario.formato || `Pereira, {fecha}

CUENTA DE COBRO

{empresa}
NIT {nit}

DEBE A:

{nombreCompleto}
C.C. {cedula}

LA SUMA DE:

${"{monto}"}

CONCEPTO:

{concepto}

{firma}

__________________________________
{nombreCompleto}
C.C. {cedula}`;

  // Reemplazar variables
formato = formato
    .replace("{nombreCompleto}", nombre)
    .replace("{cedula}", cedula)
    .replace("{correo}", correo)
    .replace("{empresa}", empresa)
    .replace("{nit}", nit)
    .replace("{concepto}", concepto)
    .replace("{monto}", ingresos.toLocaleString("es-CO"))
    .replace("{fecha}", fechaStr);

  // ===================== Generar PDF =====================
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);

  // Escribir texto
  const lineas = formato.split("\n");
  let y = 30;
  lineas.forEach((line) => {
    if (line.includes("{firma}")) {
      // reservamos espacio para la firma
      if (firma) {
        doc.addImage(firma, "PNG", 70, y, 60, 30);
      }
      y += 40;
    } else {
      doc.text(line, 20, y, { maxWidth: 170 });
      y += 10;
    }
  });

  // ===================== Guardar =====================
  doc.save("CuentaCobro.pdf");
}