--liquibase formatted sql
--changeset aniruddh.singh:update_agent_allocation_summary_v1 runOnChange:true stripComments:false splitStatements:false context:agent_allocation_summary_v1 labels:agents
--comment: agent_allocation_summary_v1 initial commit for generic allocation summary sp
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.agent_allocation_summary(varchar);

CREATE OR REPLACE FUNCTION inventory_smart.agent_allocation_summary(p_allocation_code varchar)
RETURNS TABLE(
  summary_parameter varchar,
  value text
)
LANGUAGE sql
AS $function$
WITH
  -- 1) Base rows for a single plan (materialized for reuse)
  tmp_crafg AS MATERIALIZED (
    SELECT
      article,
      store,
      retail_size_cd,
      allocation_code,
      pack_dc_allocation,
      allocated_total::numeric AS allocated_total,
      constrained_forecast::numeric AS constrained_forecast,
      updated_oh_oo_it::numeric AS updated_oh_oo_it,
      store_grade,
      c.min_influenced_allocation,
      c.max_supression_flag
    FROM inventory_smart.create_allocation_result_flat_gurobi c
    WHERE c.allocation_code = p_allocation_code
    AND COALESCE(c.is_deleted, false) = false
    AND c.updated_at::date >= (( current_date::date at time zone 'America/Chicago')::date) AT TIME ZONE 'America/Chicago'
    AND c.updated_at::date < (( current_date::date at time zone 'America/Chicago')::date + interval '1 day') AT TIME ZONE 'America/Chicago'
  ),
  -- 2) Normalize pack_dc_allocation JSON into rows
  pack_norm AS MATERIALIZED (
    WITH src AS MATERIALIZED (
      SELECT
        c.article,
        c.store,
        c.retail_size_cd AS retail_size_id,
        c.allocation_code,
        c.pack_dc_allocation::jsonb AS pack_json
      FROM tmp_crafg c
      WHERE c.pack_dc_allocation IS NOT NULL
    ),
    dc_expanded AS MATERIALIZED (
      SELECT
        s.article, s.store, s.retail_size_id, s.allocation_code,
        e.key::text AS dc_code,
        e.value     AS dc_obj
      FROM src s
      CROSS JOIN LATERAL jsonb_each(s.pack_json) AS e
    )
    SELECT
      d.article,
      d.store,
      d.retail_size_id,
      d.allocation_code,
      d.dc_code,
      pa.pack_allocated::text           AS pack_allocated,       -- pack_type_id (text)
      COALESCE((paq.qty)::numeric, 0)   AS packs_allocated_qty,  -- dc+pack allocated
      COALESCE((pav.avail)::numeric, 0) AS packs_available_qty   -- dc+pack available (repeated per store)
    FROM dc_expanded d
    LEFT JOIN LATERAL jsonb_array_elements_text(d.dc_obj->'packs_allocated')      WITH ORDINALITY pa (pack_allocated, idx) ON true
    LEFT JOIN LATERAL jsonb_array_elements_text(d.dc_obj->'packs_allocated_qty')  WITH ORDINALITY paq(qty, idx2)  ON pa.idx = paq.idx2
    LEFT JOIN LATERAL jsonb_array_elements_text(d.dc_obj->'packs_available_qty')  WITH ORDINALITY pav(avail, idx3) ON pa.idx = pav.idx3
  ),
  -- 3a) Units allocated by DC
  units_by_dc AS MATERIALIZED (
    SELECT allocation_code, dc_code,
           SUM(COALESCE(packs_allocated_qty,0))::numeric AS units_allocated
    FROM pack_norm
    GROUP BY allocation_code, dc_code
  ),
  -- 3b) Units allocated by pack_type_id
  units_by_pack AS MATERIALIZED (
    SELECT allocation_code, pack_allocated,
           SUM(COALESCE(packs_allocated_qty,0))::numeric AS units_allocated
    FROM pack_norm
    GROUP BY allocation_code, pack_allocated
  ),
  -- 3c) Net DC available (deduplicate availability across stores)
  pack_keys AS MATERIALIZED (
    SELECT DISTINCT allocation_code, article, retail_size_id, dc_code, pack_allocated
    FROM pack_norm
  ),
  pack_alloc_sum AS MATERIALIZED (
    SELECT allocation_code, article, retail_size_id, dc_code, pack_allocated,
           SUM(packs_allocated_qty)::numeric AS packs_allocated_qty_sum
    FROM pack_norm
    GROUP BY allocation_code, article, retail_size_id, dc_code, pack_allocated
  ),
  pack_avail_once AS MATERIALIZED (
    SELECT allocation_code, article, retail_size_id, dc_code, pack_allocated,
           MAX(packs_available_qty)::numeric AS packs_available_qty_once
    FROM pack_norm
    GROUP BY allocation_code, article, retail_size_id, dc_code, pack_allocated
  ),
  net_dc_available AS MATERIALIZED (
    SELECT
      k.allocation_code,
      k.article,
      k.dc_code,
      SUM(COALESCE(av.packs_available_qty_once,0) - COALESCE(al.packs_allocated_qty_sum,0))::numeric AS net_available
    FROM pack_keys k
    LEFT JOIN pack_avail_once av
      ON av.allocation_code = k.allocation_code
     AND av.article         = k.article
     AND av.retail_size_id  = k.retail_size_id
     AND av.dc_code         = k.dc_code
     AND av.pack_allocated  = k.pack_allocated
    LEFT JOIN pack_alloc_sum al
      ON al.allocation_code = k.allocation_code
     AND al.article         = k.article
     AND al.retail_size_id  = k.retail_size_id
     AND al.dc_code         = k.dc_code
     AND al.pack_allocated  = k.pack_allocated
    GROUP BY k.allocation_code, k.article, k.dc_code
  ),
  -- 3d) Units allocated by article
  units_by_article AS MATERIALIZED (
    SELECT allocation_code, article,
           SUM(COALESCE(allocated_total,0))::numeric AS units_allocated
    FROM tmp_crafg
    GROUP BY allocation_code, article
  ),
  -- 3e) Units allocated by store grade
  units_by_grade AS MATERIALIZED (
    SELECT allocation_code, COALESCE(store_grade,'NA') AS store_grade,
           SUM(COALESCE(allocated_total,0))::numeric AS units_allocated
    FROM tmp_crafg
    GROUP BY allocation_code, COALESCE(store_grade,'NA')
  ),
  -- 4) Constrained metrics (map pack units using sdau.size)
  sdau_map AS MATERIALIZED (
    SELECT article, size::text AS retail_size_id, pack_type_id,
           MAX(COALESCE(units_in_pack,1)) AS units_in_pack
    FROM inventory_smart.sku_dc_available_units
    GROUP BY article, size, pack_type_id
  ),
  alloc_units_by_row AS MATERIALIZED (
    SELECT p.article, p.store, p.retail_size_id, p.allocation_code,
           SUM(p.packs_allocated_qty * COALESCE(s.units_in_pack,1))::numeric AS allocated_units_for_row
    FROM pack_norm p
    LEFT JOIN sdau_map s
      ON s.article = p.article
     AND s.retail_size_id = p.retail_size_id
     AND s.pack_type_id::text = p.pack_allocated
    GROUP BY p.article, p.store, p.retail_size_id, p.allocation_code
  ),
  row_demand AS MATERIALIZED (
    SELECT c.article, c.store, c.retail_size_cd AS retail_size_id, c.allocation_code,
           (COALESCE(c.constrained_forecast,0) - COALESCE(c.updated_oh_oo_it,0))::numeric AS demand_after_inventory
    FROM tmp_crafg c
  ),
  constrained_rows AS MATERIALIZED (
    SELECT r.article, r.store, r.retail_size_id, r.allocation_code,
           r.demand_after_inventory,
           COALESCE(a.allocated_units_for_row,0)::numeric AS allocated_units_for_row,
           (r.demand_after_inventory > COALESCE(a.allocated_units_for_row,0)) AS is_constrained
    FROM row_demand r
    LEFT JOIN alloc_units_by_row a
      ON a.article = r.article
     AND a.store = r.store
     AND a.retail_size_id = r.retail_size_id
     AND a.allocation_code = r.allocation_code
  ),
  plan_vals AS MATERIALIZED (
    SELECT
      MAX((pm.attribute_value)::numeric) FILTER (WHERE pm.attribute_name = 'no_allocated_articles') AS no_allocated_articles,
      MAX((pm.attribute_value)::numeric) FILTER (WHERE pm.attribute_name = 'no_stores_allocated')  AS no_stores_allocated,
      MAX((pm.attribute_value)::numeric) FILTER (WHERE pm.attribute_name = 'total_allocated_qty')  AS total_allocated_qty
    FROM inventory_smart.plan_attributes pm
    WHERE pm.plan_code = p_allocation_code
  )
SELECT 'Total products allocated'::varchar AS summary_parameter,
       COALESCE((SELECT no_allocated_articles::text FROM plan_vals), '0') AS value
UNION ALL
SELECT 'Total stores allocated',
       COALESCE((SELECT no_stores_allocated::text FROM plan_vals), '0')
UNION ALL
SELECT 'Total units allocated',
       COALESCE((SELECT total_allocated_qty::text FROM plan_vals), '0')
UNION ALL
SELECT format('Total Units allocated in dc %s', dc_code),
       COALESCE(SUM(units_allocated), 0)::text
FROM units_by_dc
GROUP BY dc_code
UNION ALL
SELECT format('Total Units allocated in store grade %s', store_grade),
       COALESCE(SUM(units_allocated), 0)::text
FROM units_by_grade
GROUP BY store_grade
UNION ALL
SELECT format('Total Units allocated in pack_type_id %s', COALESCE(pack_allocated,'NA')),
       COALESCE(SUM(units_allocated), 0)::text
FROM units_by_pack
GROUP BY pack_allocated
UNION ALL
SELECT format('Total Units allocated in article %s', article),
       COALESCE(SUM(units_allocated), 0)::text
FROM units_by_article
GROUP BY article
UNION ALL
SELECT format('Net DC available for article %s and dc_code %s', article, dc_code),
       COALESCE(net_available, 0)::text
FROM net_dc_available
UNION ALL
SELECT 'Products with constrained allocation',
       COALESCE(COUNT(DISTINCT article), 0)::text
FROM constrained_rows
WHERE is_constrained
UNION ALL
SELECT 'Stores with constrained allocation',
       COALESCE(COUNT(DISTINCT store), 0)::text
FROM constrained_rows
WHERE is_constrained
UNION ALL
SELECT 'Products with Min_influenced allocation',
       COALESCE(COUNT(DISTINCT article), 0)::text
FROM tmp_crafg
WHERE COALESCE(min_influenced_allocation, false)
UNION ALL
SELECT 'Products with Max_suppressed allocation',
       COALESCE(COUNT(DISTINCT article), 0)::text
FROM tmp_crafg
WHERE COALESCE(max_supression_flag, false)
UNION ALL
SELECT 'Stores with Min_influenced allocation',
       COALESCE(COUNT(DISTINCT store), 0)::text
FROM tmp_crafg
WHERE COALESCE(min_influenced_allocation, false)
UNION ALL
SELECT 'Stores with Max_suppressed allocation',
       COALESCE(COUNT(DISTINCT store), 0)::text
FROM tmp_crafg
WHERE COALESCE(max_supression_flag, false)
;
$function$;
