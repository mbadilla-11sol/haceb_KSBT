# KSBT — Tarifas de clases de actividad en BigQuery

Homologación de la transacción SAP **KSBT** (*Informe de precios de clases de
actividad*) sobre BigQuery, implementada en Dataform como extensión de Cortex.
Entrega, por centro de costo y clase de actividad, la tarifa plan y la real
—total, fija y variable— por ejercicio, período y versión.

> **Estado (2026-10-23):** esqueleto completo, compila. Las tablas `COST`,
> `CSSL`, `CSLA`, `TKA09`, `TKT09` y `TKA07` están pedidas a Aecorsoft y aún
> no existen en la réplica: las acciones que dependen de ellas fallan al
> correr hasta que lleguen. Falta la cuadratura contra el set de septiembre.

---

## Arquitectura

| Capa | Directorio | Prefijo | Dataset | Función |
|---|---|---|---|---|
| Fuentes | `definitions/sources/` | — | — | Declaraciones de tablas externas. No crean nada. |
| Staging | `definitions/staging/` | `stg_*_ksbt` | `pru_dtemp` | Una vista por fuente. Renombra campos SAP y filtra idioma. Sin lógica de negocio. |
| Parámetros | `definitions/intermediate/` | `cfg_ksbt` | `pru_dtemp` | Alcance (mandante, área CO, versiones, ejercicios) armado desde `workflow_settings.yaml`. |
| Intermedia | `definitions/intermediate/` | `int_*_ksbt` | `pru_dtemp` | Despivoteo de los 16 períodos, moneda, fijo/variable, maestros. |
| Consumo | `definitions/marts/` | `rpt_ksbt` | `pru_dprocesados` | El entregable. |

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
- **Unidad de precio:** `TOE/TKE`. Pendiente confirmar con la cuadratura si
  KSBT muestra la tarifa por unidad de precio o por unidad.
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
| Ingesta | `COST` sin tope de 1M filas; replicación activa hasta septiembre 2026 o después. |
| Período del set de cuadratura | `KSBT_sep.XLSX` no trae ejercicio/período: confirmar 2026/009 y versión. |
| Unidad de precio | Ver *Reglas de negocio*. |
| Indicador fijo/variable | La propuesta lo pide "según el maestro". Se expone `CSLA.FIXVO`; validar con Controlling. |
| Versiones por ejercicio | `stg_version_fiscal_year_ksbt` (TKA07) aún no se usa para validar `cfg_ksbt`. |
