/**
 * Utilidades compartidas del modelo KSBT.
 *
 * Todo lo que depende del ambiente o del alcance sale de
 * workflow_settings.yaml (vars). Ningun .sqlx escribe esos valores.
 */

const vars = () => dataform.projectConfig.vars || {};

/** Literal SQL de un string, con las comillas escapadas. */
function sqlString(value) {
  return `'${String(value).replace(/'/g, "\\'")}'`;
}

/**
 * Lista de versiones (VERSN) en alcance como literal de arreglo SQL.
 * vars.versiones = "000,0GR" -> ['000', '0GR']
 */
function versiones() {
  const lista = String(vars().versiones || "")
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v);
  if (lista.length === 0) {
    throw new Error("vars.versiones no puede estar vacio");
  }
  return `[${lista.map(sqlString).join(", ")}]`;
}

/** Ultimo ejercicio en alcance. Vacio -> ano en curso. */
function ejercicioHasta() {
  const h = String(vars().ejercicio_hasta || "").trim();
  if (!h) {
    return "EXTRACT(YEAR FROM CURRENT_DATE())";
  }
  if (!/^\d{4}$/.test(h)) {
    throw new Error(`vars.ejercicio_hasta debe ser AAAA o vacio, y vino: '${h}'`);
  }
  return h;
}

function ejercicioDesde() {
  const d = String(vars().ejercicio_desde || "").trim();
  if (!/^\d{4}$/.test(d)) {
    throw new Error(`vars.ejercicio_desde debe ser AAAA, y vino: '${d}'`);
  }
  return d;
}

/**
 * Factor para llevar un importe CURR de SAP a su valor real.
 *
 * SAP guarda los importes con 2 decimales fijos aunque la moneda tenga
 * otros. COP tiene CURRDEC = 0 en TCURX, asi que un 502.83 guardado son
 * 50.283 pesos. Las monedas que no estan en TCURX usan 2 decimales.
 *
 * Se devuelve como NUMERIC para que el producto con un importe CURR
 * (NUMERIC en la replica) no pase por FLOAT64.
 *
 *   factorMoneda("dec") -> CAST(POWER(10, 2 - COALESCE(dec.currdec, 2)) AS NUMERIC)
 */
function factorMoneda(aliasTcurx) {
  return `CAST(POWER(10, 2 - COALESCE(${aliasTcurx}.currdec, 2)) AS NUMERIC)`;
}

module.exports = {
  sqlString,
  versiones,
  ejercicioDesde,
  ejercicioHasta,
  factorMoneda,
};
