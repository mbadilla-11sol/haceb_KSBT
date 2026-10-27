# KSBT — Tarifas de clases de actividad en BigQuery

Homologación de la transacción SAP **KSBT** (*Informe de precios de clases de
actividad*) sobre BigQuery, implementada en Dataform como extensión de Cortex.
Entrega, por centro de costo y clase de actividad, la tarifa plan y la real
—total, fija y variable— por ejercicio, período y versión.

> **Estado (2026-10-26):** fuentes replicadas (`COST` 162.605 filas) y
> cuadratura de septiembre 2026 al 100 %.

---

## Arquitectura

| Capa | Directorio | Prefijo | Variable de dataset | Función |
|---|---|---|---|---|
| Fuentes | `definitions/sources/` | — | — | Declaraciones de tablas externas. No crean nada. |
| Staging | `definitions/staging/` | `stg_*_ksbt` | `dataset_temp` | Una vista por fuente. Renombra campos SAP y filtra idioma. Sin lógica de negocio. |
| Parámetros | `definitions/intermediate/` | `cfg_ksbt` | `dataset_temp` | Alcance (mandante, área CO, versiones, ejercicios) armado desde `workflow_settings.yaml`. |
| Intermedia | `definitions/intermediate/` | `int_*_ksbt` | `dataset_temp` | Despivoteo de los 16 períodos, moneda, fijo/variable, maestros. |
| Consumo | `definitions/marts/` | `rpt_ksbt` | `dataset_procesados` | El entregable. |

Durante el desarrollo **todo el modelo vive en un único dataset, `haceb-qa.ksbt`**
(US): las dos variables y las assertions apuntan ahí. Así se puede
reconstruir o borrar entero sin tocar objetos de otros modelos. Dataform crea
el dataset en la primera corrida. Para el paso a productivo basta con
separar las capas cambiando `dataset_temp` y `dataset_procesados`.

Flujo:

```
COST ─┐
CSSL ─┤
CSLA ─┼─► stg_*_ksbt ─► int_tarifas_ksbt ─► rpt_ksbt
CSLT ─┤                  ▲
TKA01, TCURX ─┤        cfg_ksbt
CostCentersMD (Cortex) ┘
TKA09 + TKT09 ─► stg_versions_ksbt ───────────┘ (texto de versión en rpt)
```

## Fuentes

| Script | Esquema | Objetos |
|---|---|---|
| `sources/pru_cortex.js` | réplica SAP (Aecorsoft) | `cost`, `cssl`, `csla`, `tka09`, `tkt09`, `tka07` (pendientes), `cslt`, `tka01`, `tcurx` |
| `sources/reporting_cortex.js` | Cortex reporting | `CostCentersMD` |

## Reglas de negocio

- **Tipo de valor:** `01` plan y `04` real. `rpt_ksbt` los pone lado a lado.
- **Objeto CO:** `OBJNR = 'KL' + KOKRS(4) + KOSTL(10) + LSTAR(6)`. Se
  descompone en staging y se verifica contra `CSSL.OBJNR`
  (`object_number_matches_cssl`).
- **Moneda:** `COST` no trae campo de moneda. `TOG/TOF` están en moneda del
  objeto (la del centro de costo) y `TKG/TKF` en la del área CO. Cada importe
  se multiplica por `10^(2 - TCURX.CURRDEC)`: en COP, × 100. Se conserva el
  valor crudo (`*_raw`).
- **Fijo / variable:** variable = total − fijo.
- **Unidad de precio:** `TOE/TKE`. En el set de septiembre vale 1 y la
  tarifa total cuadra tal cual.
- **Indicador de tarifa (`TARKZ`):** `COST` trae la misma tarifa con más de
  un indicador (plan `001`+`004`, real `005`+`008`). Se toma el indicador por
  defecto de la clase en `CSLA` (`TARKZ` plan / `TARKZ_I` real) y, si no
  existe, el más bajo (`price_indicator_is_default` lo marca).
- **Períodos en cero:** se conservan, KSBT también los muestra.

## Cuadratura

| Set | Filas | Cuadran exacto |
|---|---|---|
| `KSBT_sep.XLSX` — 2026/009, versión `000`, 391 centros, 5 clases | 3.910 (1.955 plan + 1.955 real) | 3.910 (100 %) |
- **Vigencia:** `CSLA`/`CSLT` se eligen por período; los especiales (13–16)
  se asimilan a diciembre. `CostCentersMD` trae solo la versión vigente.

## Promoción a productivo

Todo lo que cambia entre ambientes vive en `workflow_settings.yaml`:

| Variable | Función |
|---|---|
| `source_project`, `source_dataset` | Réplica SAP |
| `cortex_project`, `cortex_dataset` | Capa de reporting de Cortex |
| `dataset_procesados`, `dataset_temp` | Destinos |
| `mandante`, `area_controlling`, `versiones`, `ejercicio_desde`, `ejercicio_hasta`, `idioma` | Alcance de negocio |

```bash
dataform compile
dataform run --dry-run
dataform run "--vars=source_project=haceb-prd,source_dataset=prd_cortex"
```

## Pendientes

| Tema | Descripción |
|---|---|
| Indicador de respaldo | 2.720 filas de plan solo traen `TARKZ 003` (sin el `001` por defecto). Se usan, pero ningún set de cuadratura las cubre todavía. |
| Centros sin CSSL | 160 filas de `COST` no encuentran su fila en `CSSL` (`found_in_cssl = FALSE`); la unidad sale de `CSLA`. |
| Indicador fijo/variable | La propuesta lo pide "según el maestro". Se expone `CSLA.FIXVO`; validar con Controlling. |
| Versiones por ejercicio | `stg_version_fiscal_year_ksbt` (TKA07) aún no se usa para validar `cfg_ksbt`. |
