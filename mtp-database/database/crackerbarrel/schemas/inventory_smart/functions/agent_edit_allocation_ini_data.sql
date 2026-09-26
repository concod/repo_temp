--liquibase formatted sql
--changeset aniruddh.singh:create_agent_edit_allocation_ini_data_v1.1 runOnChange:true stripComments:false splitStatements:false context:agent_allocation labels:agents_v1.1
--comment: updated commit for agent_edit_allocation_ini_data with cb specific changes
--rollback:SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.agent_edit_allocation_ini_data(varchar[], varchar[], varchar[], varchar[], date);

CREATE OR REPLACE FUNCTION inventory_smart.agent_edit_allocation_ini_data(
    p_article_list            varchar[],
    p_store_list              varchar[],
    p_size_list               varchar[],   -- pass NULL to skip size filter
    p_allocation_code_list    varchar[],
    p_as_of_date              date
)
RETURNS TABLE(
    allocation_code   varchar,
    article           varchar,
    store             varchar,
    size              varchar,
    min               numeric,
    max               numeric,
    dc_code           varchar,
    pack_type_id      varchar,
    qty_allocated     numeric,
    qty_available     numeric,
    unit_multiplier   int,
    net_capacity      int,
    net_qty_available numeric
)
LANGUAGE sql
SECURITY DEFINER
AS $function$
WITH base AS MATERIALIZED (
  SELECT
      carfg.allocation_code,
      carfg.article,
      carfg.store,
      carfg.min,
      carfg.retail_size_cd AS size,
      carfg.max,
      carfg.pack_dc_allocation::jsonb AS j
  FROM inventory_smart.create_allocation_result_flat_gurobi carfg
  JOIN inventory_smart.plan_master pm
    ON carfg.allocation_code = pm.plan_code
  WHERE pm.status = 1
    AND carfg.article = ANY (p_article_list)
    AND carfg.store   = ANY (p_store_list)
    AND (p_size_list IS NULL OR carfg.retail_size_cd = ANY (p_size_list))
    AND pm.plan_code = ANY (p_allocation_code_list)
    AND carfg.updated_at::date >= (( p_as_of_date::date at time zone 'America/Chicago')::date) AT TIME ZONE 'America/Chicago'
    AND carfg.updated_at::date < (( p_as_of_date::date at time zone 'America/Chicago')::date + interval '1 day') AT TIME ZONE 'America/Chicago'
    AND carfg.pack_dc_allocation IS NOT NULL
),
dc_level AS MATERIALIZED (
  SELECT
      b.allocation_code,
      b.article,
      b.store,
      b.size,
      b.min,
      b.max,
      dc_pairs.key   AS dc_code,
      dc_pairs.value AS dc_payload
  FROM base b
  CROSS JOIN LATERAL jsonb_each(b.j) AS dc_pairs(key, value)
),
aligned AS MATERIALIZED (
  SELECT
      d.allocation_code,
      d.article,
      d.store,
      d.size,
      d.dc_code,
      d.min,
      d.max,
      pack_ids.elem AS pack_type_id,
      COALESCE(q_alloc.elem::numeric, 0) AS qty_allocated,
      COALESCE(q_avail.elem::numeric, 0) AS qty_available,
      COALESCE(pr.elem::numeric, 0)      AS pack_rounding_factor
  FROM dc_level d
  CROSS JOIN LATERAL jsonb_array_elements_text(d.dc_payload->'packs_allocated') WITH ORDINALITY AS pack_ids(elem, ord)
  LEFT  JOIN LATERAL jsonb_array_elements_text(d.dc_payload->'packs_allocated_qty') WITH ORDINALITY AS q_alloc(elem, ord2)
         ON ord = ord2
  LEFT  JOIN LATERAL jsonb_array_elements_text(d.dc_payload->'packs_available_qty') WITH ORDINALITY AS q_avail(elem, ord3)
         ON ord = ord3
  LEFT  JOIN LATERAL jsonb_array_elements_text(d.dc_payload->'pack_rounding_factor') WITH ORDINALITY AS pr(elem, ord4)
         ON ord = ord4
),
uom_one AS MATERIALIZED (
  SELECT item_id, MAX(factor) AS factor
  FROM inventory_smart.uom
  GROUP BY item_id
),

/* dc-level net available (units) per (article, dc_code, pack_type_id) using CB-specific rules */
_dc_available_units AS MATERIALIZED (
  SELECT
      a.article,
      a.dc_code::text AS dc_code,
      a.pack_type_id::text AS pack_type_id,
      (
        AVG( CASE WHEN UPPER(COALESCE(paf.ia_sku_type, '')) = 'EACHES'
           THEN a.qty_available * COALESCE(a.pack_rounding_factor::numeric, COALESCE(dpc.units_in_pack::numeric, 1), 1)
           ELSE a.qty_available
      END )
        - SUM(
            a.qty_allocated *
            CASE
              WHEN UPPER(COALESCE(paf.ia_sku_type, '')) = 'EACHES'
                THEN COALESCE(a.pack_rounding_factor::numeric, COALESCE(dpc.units_in_pack::numeric, 1), 1)
              ELSE 1
            END
          )
      ) AS net_qty_available
  FROM aligned a
  LEFT JOIN inventory_smart.dc_pack_configuration dpc
    ON dpc.article = a.article
   AND dpc.pack_type_id::text = a.pack_type_id::text
   AND dpc.size = a.size
  LEFT JOIN "global".product_attributes_filter paf
    ON paf.product_code = a.pack_type_id::varchar
  GROUP BY 1, 2, 3
)
SELECT
    a.allocation_code,
    a.article,
    a.store,
    a.size,
    a.min,
    a.max,
    a.dc_code,
    a.pack_type_id,

    /* qty_allocated in units per CB rule */
    (
      CASE WHEN UPPER(COALESCE(paf.ia_sku_type, '')) = 'EACHES'
           THEN a.qty_allocated * COALESCE(a.pack_rounding_factor::numeric, COALESCE(dpc.units_in_pack::numeric, 1), 1)
           ELSE a.qty_allocated
      END
    ) AS qty_allocated,

    /* qty_available in units from dc_pack_configuration */
    (
      CASE WHEN UPPER(COALESCE(paf.ia_sku_type, '')) = 'EACHES'
           THEN a.qty_available * COALESCE(a.pack_rounding_factor::numeric, COALESCE(dpc.units_in_pack::numeric, 1), 1)
           ELSE a.qty_available
      END
    ) AS qty_available,

    /* unit_multiplier prioritizes dc pack config, then rounding factor, then uom, then 1 */
    GREATEST(
      COALESCE(dpc.units_in_pack::numeric, 0),
      COALESCE(a.pack_rounding_factor::numeric, 0),
      COALESCE(uom.factor::numeric, 0),
      1::numeric
    )::int AS unit_multiplier,

    1000000::int AS net_capacity,

    dcav.net_qty_available
FROM aligned a
LEFT JOIN uom_one  uom
  ON a.article = uom.item_id
LEFT JOIN inventory_smart.dc_pack_configuration dpc
  ON dpc.article = a.article
 AND dpc.pack_type_id::text = a.pack_type_id::text
 AND dpc.size = a.size
LEFT JOIN "global".product_attributes_filter paf
  ON paf.product_code = a.pack_type_id::varchar
LEFT JOIN _dc_available_units dcav
  ON dcav.article      = a.article
 AND dcav.dc_code      = a.dc_code::text
 AND dcav.pack_type_id = a.pack_type_id::text;
$function$;