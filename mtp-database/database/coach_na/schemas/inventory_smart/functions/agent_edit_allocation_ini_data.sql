--liquibase formatted sql
--changeset aniruddh.singh:create_agent_edit_allocation_ini_data_v1 runOnChange:true stripComments:false splitStatements:false context:agent_allocation labels:agents_v1
--comment: Returns initial allocated quantity + constraints for edit-allocation UI adding update at range
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
      COALESCE(q_avail.elem::numeric, 0) AS qty_available
  FROM dc_level d
  CROSS JOIN LATERAL jsonb_array_elements_text(d.dc_payload->'packs_allocated') WITH ORDINALITY AS pack_ids(elem, ord)
  LEFT  JOIN LATERAL jsonb_array_elements_text(d.dc_payload->'packs_allocated_qty') WITH ORDINALITY AS q_alloc(elem, ord2)
         ON ord = ord2
  LEFT  JOIN LATERAL jsonb_array_elements_text(d.dc_payload->'packs_available_qty') WITH ORDINALITY AS q_avail(elem, ord3)
         ON ord = ord3
),
uom_one AS MATERIALIZED (
  SELECT item_id, MAX(factor) AS factor
  FROM inventory_smart.uom
  GROUP BY item_id
),
sdau_one AS MATERIALIZED (
  SELECT
      article,
      dc_code::text AS dc_code,
      pack_type_id,
      MAX(units_in_pack) AS units_in_pack
  FROM inventory_smart.sku_dc_available_units
  GROUP BY article, dc_code::text, pack_type_id
),

/* minimal net_capacity computation per (allocation_code, article, store) */
base_table_net AS MATERIALIZED (
  SELECT
      carfg.article,
      carfg.store              AS store_code,
      pm.plan_code             AS allocation_code,
      carfg.pack_dc_allocation
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
article_l1_net AS MATERIALIZED (
  SELECT DISTINCT paf.article, paf.l0_name, paf.l1_name, paf.l2_name
  FROM global.product_attributes_filter paf
  WHERE paf.article = ANY (p_article_list)
),
flat_alloc_net AS MATERIALIZED (
  SELECT
      bt.allocation_code,
      bt.article,
      bt.store_code,
      SUM(x.elem::numeric) AS allocated_qty
  FROM (
    SELECT DISTINCT allocation_code, article, store_code, pack_dc_allocation
    FROM base_table_net
    WHERE pack_dc_allocation IS NOT NULL
  ) bt
  CROSS JOIN LATERAL jsonb_each(bt.pack_dc_allocation) AS dc(k, v)
  CROSS JOIN LATERAL jsonb_array_elements_text(v->'packs_allocated_qty') AS x(elem)
  GROUP BY 1, 2, 3
),
store_dept_inv_net AS MATERIALIZED (
  SELECT
      li.store_code,
      COALESCE(SUM(li.oh), 0) + COALESCE(SUM(li.it), 0) + COALESCE(SUM(li.oo), 0) AS store_inv
  FROM inventory_smart.latest_inventory li
  GROUP BY 1
),
store_capacity_net AS MATERIALIZED (
  SELECT
      suc.store_code,
      suc.product_hierarchy,
      MAX(suc.unit_capacity) AS unit_capacity
  FROM inventory_smart.store_unit_capacity suc
  WHERE suc.store_code = ANY (SELECT DISTINCT store_code FROM base_table_net)
  GROUP BY 1, 2
),
alloc_by_store_dept_net AS MATERIALIZED (
  SELECT
      fa.allocation_code,
      fa.article,
      fa.store_code,
      al.l0_name,
      al.l1_name,
      al.l2_name,
      SUM(fa.allocated_qty) AS allocated_qty
  FROM flat_alloc_net fa
  JOIN article_l1_net al ON fa.article = al.article
  GROUP BY 1, 2, 3, 4, 5, 6
),
net_capacity_by_sas AS MATERIALIZED (
  SELECT
      a.allocation_code,
      a.article,
      a.store_code,
      (
        MAX(COALESCE(sc.unit_capacity, 0))
        - SUM(COALESCE(sdi.store_inv, 0))
        - SUM(COALESCE(a.allocated_qty, 0))
      )::int AS net_capacity
  FROM alloc_by_store_dept_net a
  LEFT JOIN store_capacity_net sc
    ON sc.store_code = a.store_code
   AND sc.product_hierarchy = concat(a.l0_name, '-', a.l1_name, '-', a.l2_name)
  LEFT JOIN store_dept_inv_net sdi
    ON sdi.store_code = a.store_code
  GROUP BY a.allocation_code, a.article, a.store_code
),

/* dc-level net available (units) per (article, dc_code, pack_type_id) */
_dc_level_dc AS MATERIALIZED (
  SELECT
      b.article,
      (dc_pairs.key)::text   AS dc_code,
      dc_pairs.value         AS dc_payload
  FROM base b
  CROSS JOIN LATERAL jsonb_each(b.j) AS dc_pairs(key, value)
),
_dc_aligned AS MATERIALIZED (
  SELECT
      d.article,
      d.dc_code,
      (pack_ids.elem)::text AS pack_type_id,
      AVG(COALESCE(q_avail.elem::numeric, 0)) - SUM(COALESCE(q_alloc.elem::numeric, 0)) AS net_qty_base
  FROM _dc_level_dc d
  CROSS JOIN LATERAL jsonb_array_elements_text(d.dc_payload->'packs_allocated') WITH ORDINALITY AS pack_ids(elem, ord)
  LEFT  JOIN LATERAL jsonb_array_elements_text(d.dc_payload->'packs_allocated_qty') WITH ORDINALITY AS q_alloc(elem, ord2)
         ON ord = ord2
  LEFT  JOIN LATERAL jsonb_array_elements_text(d.dc_payload->'packs_available_qty') WITH ORDINALITY AS q_avail(elem, ord3)
         ON ord = ord3
  GROUP BY 1, 2, 3
),
_dc_available_units AS MATERIALIZED (
  SELECT 
      da.article,
      da.dc_code,
      da.pack_type_id,
      (da.net_qty_base * COALESCE(sdau.units_in_pack::numeric, 1)) AS net_qty_available
  FROM _dc_aligned da
  LEFT JOIN sdau_one sdau
    ON sdau.article = da.article
   AND sdau.dc_code = da.dc_code
   AND sdau.pack_type_id::text = da.pack_type_id
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
    COALESCE(sdau.units_in_pack::numeric, 1)*a.qty_allocated AS qty_allocated,
    a.qty_available,
    GREATEST(
      COALESCE(uom.factor::numeric, 0),
      COALESCE(sdau.units_in_pack::numeric, 0),
      1::numeric
    )::int AS unit_multiplier,
    nc.net_capacity,
    dcav.net_qty_available
FROM aligned a
LEFT JOIN uom_one  uom
  ON a.article = uom.item_id
LEFT JOIN sdau_one sdau
  ON a.pack_type_id = sdau.pack_type_id
 AND a.dc_code::text = sdau.dc_code
 AND a.article = sdau.article
LEFT JOIN net_capacity_by_sas nc
  ON nc.allocation_code = a.allocation_code
 AND nc.article        = a.article
 AND nc.store_code     = a.store
LEFT JOIN _dc_available_units dcav
  ON dcav.article      = a.article
 AND dcav.dc_code      = a.dc_code::text
 AND dcav.pack_type_id = a.pack_type_id::text;
$function$;