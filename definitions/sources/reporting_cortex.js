// =============================================================================
// Declaracion de modelos de Cortex en <cortex_project>.<cortex_dataset>
// Capa de reporting de Cortex Data Foundation. Un script por esquema.
//
// OJO: la capa esta congelada desde el 11-12 de agosto de 2026 (ningun
// proceso la refresca). CostCentersMD solo trae la version del centro de
// costo vigente a la fecha en que se construyo.
// =============================================================================

declare({
  database: dataform.projectConfig.vars.cortex_project,
  schema: dataform.projectConfig.vars.cortex_dataset,
  name: "CostCentersMD",
  description: "Cortex - Maestro de centros de costo (CSKS + CSKT), una fila por mandante, area CO, centro de costo, fecha fin de validez e idioma. Filtrado en origen a la version vigente al momento de construirse. Verificado 2026-10-23: los 391 centros de costo del set de cuadratura KSBT de septiembre existen en csks con KOKRS 1000 y moneda COP."
});
