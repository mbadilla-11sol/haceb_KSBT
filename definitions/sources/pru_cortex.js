// =============================================================================
// Declaracion de tablas fuente en <source_project>.<source_dataset>
// Replica de las tablas SAP hecha por Aecorsoft. Un script por esquema.
//
// El proyecto y el dataset NO estan escritos aca: salen de
// workflow_settings.yaml (vars.source_project / vars.source_dataset).
//
// Campos y claves confirmados contra el diccionario SAP replicado
// (dd03l / dd04t) el 2026-10-23.
//
// ESTADO 2026-10-26: cost, cssl, csla, tka09, tkt09 y tka07 ya estan en la
// replica (cost: 162.605 filas, clave SAP unica, sin duplicados de carga).
// =============================================================================

const PROJECT = dataform.projectConfig.vars.source_project;
const DATASET = dataform.projectConfig.vars.source_dataset;

// --- Tarifas -----------------------------------------------------------------

declare({
  database: PROJECT,
  schema: DATASET,
  name: "cost",
  description: "SAP COST - Totales de tarifas por objeto CO. Clave: MANDT, LEDNR, OBJNR, GJAHR, WRTTP, VERSN, TARKZ, PERBL. Una fila trae los 16 periodos en columnas: TOG/TOF/TOE (total, fijo y unidad de precio en moneda del objeto) y TKG/TKF/TKE (idem en moneda del area CO). Importes CURR(11,2). Replicada 2026-10-26."
});

declare({
  database: PROJECT,
  schema: DATASET,
  name: "cssl",
  description: "SAP CSSL - Clase de actividad por centro de costo y ejercicio. Clave: MANDT, KOKRS, KOSTL, LSTAR, GJAHR. Aporta el OBJNR (KL + KOKRS + KOSTL + LSTAR) que une con COST. Replicada 2026-10-26."
});

declare({
  database: PROJECT,
  schema: DATASET,
  name: "csla",
  description: "SAP CSLA - Maestro de clases de actividad con vigencia. Clave: MANDT, KOKRS, LSTAR, DATBI. Unidad (LEINH), tipo de clase (LATYP), indicadores de tarifa (TARKZ, TARKZ_I) y FIXVO. Replicada 2026-10-26."
});

declare({
  database: PROJECT,
  schema: DATASET,
  name: "tka09",
  description: "SAP TKA09 - Versiones CO por area de controlling. Clave: MANDT, KOKRS, VERSN. ACTUAL marca la version real, PLANNING la habilitada para plan. Replicada 2026-10-26."
});

declare({
  database: PROJECT,
  schema: DATASET,
  name: "tkt09",
  description: "SAP TKT09 - Textos de version CO. Clave: MANDT, LANGU, KOKRS, VERSN. Replicada 2026-10-26."
});

declare({
  database: PROJECT,
  schema: DATASET,
  name: "tka07",
  description: "SAP TKA07 - Parametros de version CO por ejercicio. Clave: MANDT, KOKRS, VERSN, GJAHR. Metodos de determinacion de tarifa plan/real (RATMP/RATMI), tipo de cambio (KURST). Replicada 2026-10-26."
});

// --- Maestros ya replicados --------------------------------------------------

declare({
  database: PROJECT,
  schema: DATASET,
  name: "cslt",
  description: "SAP CSLT - Texto de clase de actividad por idioma. 5 filas al 2026-10-23, todas KOKRS 1000 / SPRAS S / DATBI 9999-12-31: PP0001, PP0002, PP0005, PP0006, PP0008."
});

declare({
  database: PROJECT,
  schema: DATASET,
  name: "tka01",
  description: "SAP TKA01 - Areas de controlling. Aporta el texto (BEZEI) y la moneda del area CO (WAERS), que es la moneda de los campos TKG/TKF de COST."
});

declare({
  database: PROJECT,
  schema: DATASET,
  name: "tcurx",
  description: "SAP TCURX - Decimales por moneda. COP tiene CURRDEC = 0: los importes CURR(x,2) de SAP se multiplican por 10^(2 - CURRDEC). Las monedas ausentes usan 2 decimales."
});
