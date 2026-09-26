--liquibase formatted sql
--changeset ananya.gupta:store_transfer_recommendations runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_transfer_recommendations
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_store_transfer_recommendation_data(refcursor, varchar, varchar, varchar, varchar, varchar, text, text);

CREATE OR REPLACE FUNCTION inventory_smart.get_store_transfer_recommendation_data(p_cur refcursor, p_allocation_code character varying, p_article character varying, p_source_code character varying, p_destination_code character varying, p_ignore_allocation_code character varying, p_store_attr_keys_csv text DEFAULT NULL::text, p_prod_attr_keys_csv text DEFAULT NULL::text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
  _pm_date date;
  _alloc_code text;
  _article_filter text := '';
  _dst_filter text := '';
  _src_filter text := '';
  _prod_attr_cols text := '';
  _src_store_cols text := '';
  _dst_store_cols text := '';
  _sql text;
BEGIN
  /* Resolve plan date window from plan_master using allocation code (or ignore code if provided) */
  _alloc_code :=
    CASE WHEN coalesce(p_ignore_allocation_code,'') <> '' THEN p_ignore_allocation_code
         ELSE p_allocation_code
    END;

  EXECUTE format($q$select date(created_at) from inventory_smart.plan_master where plan_code=%L$q$, _alloc_code)
    INTO _pm_date;

  /* Build basic WHERE fragments */
  IF coalesce(p_article,'') <> '' THEN
    _article_filter := format($f$ AND carfs.article = %L $f$, p_article);
  END IF;

  IF coalesce(p_destination_code,'') <> '' THEN
    _dst_filter := format($f$ AND carfs.store = %L $f$, p_destination_code);
  END IF;

  IF coalesce(p_source_code,'') <> '' THEN
    -- carfs.dc_codes is _varchar; use ANY() against that array
    _src_filter := format($f$ where source_store_code = %L $f$, p_source_code);
  END IF;

  /* Dynamic projections for product attributes */
  IF p_prod_attr_keys_csv IS NOT NULL AND btrim(p_prod_attr_keys_csv) <> '' THEN
    SELECT string_agg(
             format(', paf.%I AS %s',
                    btrim(col),
                    regexp_replace(btrim(col), '[^a-zA-Z0-9_]', '_','g')),
             E'\n')
      INTO _prod_attr_cols
    FROM regexp_split_to_table(p_prod_attr_keys_csv, '\s*,\s*') AS t(col);
  END IF;

  /* Dynamic projections for store attributes (source_/destination_) */
  IF p_store_attr_keys_csv IS NOT NULL AND btrim(p_store_attr_keys_csv) <> '' THEN
    SELECT string_agg(
             format(', source_saf.%I AS source_%s',
                    btrim(col),
                    regexp_replace(btrim(col), '[^a-zA-Z0-9_]', '_','g')),
             E'\n')
      INTO _src_store_cols
    FROM regexp_split_to_table(p_store_attr_keys_csv, '\s*,\s*') AS t(col);

    SELECT string_agg(
             format(', destination_saf.%I AS destination_%s',
                    btrim(col),
                    regexp_replace(btrim(col), '[^a-zA-Z0-9_]', '_','g')),
             E'\n')
      INTO _dst_store_cols
    FROM regexp_split_to_table(p_store_attr_keys_csv, '\s*,\s*') AS t(col);
  END IF;

  _sql := format($SQL$
    WITH base_table AS MATERIALIZED (
      SELECT
        carfs.article,
        carfs.store                         AS destination_store_code,
        carfs.retail_size_cd                AS size,
        carfs.delivery_dt,
        carfs.allocated_total,
        carfs.oh, carfs.oo, carfs.it,
        carfs.wos,                         
        carfs.pack_dc_allocation,
        carfs.min, carfs.max,
        carfs.updated_oh_oo_it,
        carfs.demand,                       
        carfs.demand_type,
        carfs.inventory_source, 
        carfs.wk_count_final                AS dst_weeks
      FROM inventory_smart.create_allocation_result_flat_gurobi carfs
      WHERE carfs.created_at >= %L::timestamp
        AND carfs.created_at <  (%L::timestamp + interval '1 day')
        AND carfs.allocation_code = %L
        %s  -- article
        %s  -- destination
        
    )

    ,flat_table as (
        	SELECT article,destination_store_code,
        		   split_part(js.key, '_', 1) source_store_code, 
					     js.key as original_source_store_code,
        		   UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated')::text, '[]', '{}'))::text[]) pack_type_id,
        		   UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) packs_allocated_qty,
        		   UNNEST((TRANSLATE((js.value::jsonb->>'packs_available_qty')::text, '[]', '{}'))::numeric[]) available_qty,
        		   UNNEST((TRANSLATE((js.value::jsonb->>'pack_rounding_factor')::text, '[]', '{}'))::numeric[]) pack_rounding_factor
        	FROM (
        		SELECT * FROM base_table 
        		) foo , JSONB_EACH(pack_dc_allocation) js group by 1,2,3,4,5,6,7,8)
     ,dc_pack_config as materialized (
        	SELECT dpc.article, ft.source_store_code, ft.original_source_store_code,ft.destination_store_code, dpc.pack_type_id, dpc.size, dpc.pack_type, dpc.units_in_pack,
        	   ft.available_qty as available_qty_packs,
        	   ft.packs_allocated_qty,
        	   ft.available_qty * dpc.units_in_pack::double precision AS  available_qty,
        	   ft.packs_allocated_qty * dpc.units_in_pack::double precision AS total_allocated_qty,
        	   coalesce(ft.pack_rounding_factor,1) as pack_rounding_factor
        FROM inventory_smart.dc_pack_configuration dpc
        JOIN flat_table as ft on  dpc.article = ft.article and dpc.pack_type_id = ft.pack_type_id
		%s  -- source-any
        )
        ,dc_pack_inv as (
        	select source_store_code,original_source_store_code, article, destination_store_code, pack_type_id, pack_type,size,
--        	ARRAY_AGG(size) as size,
        	  avg(available_qty_packs) as dc_available_packs ,
        	  sum(available_qty) as available_qty,
        	  sum(total_allocated_qty) AS total_allocated_qty,
        	  avg(packs_allocated_qty) packs_allocated_qty
        from dc_pack_config p	
        group by 1,2,3,4,5,6,7
        ),
    /* Source size-grain: inventory before and transfer units (both in eaches) */
     paf AS (
     	SELECT paf.article, paf.product_code,paf.size %s
      FROM (SELECT DISTINCT article,size FROM dc_pack_inv) b
      JOIN global.product_attributes_filter paf USING(article,size)
    )
   -- SELECT * from paf ;
	,store_mapping AS (
  SELECT sc.source_store_code, sc.destination_store_code,
         sm.distance_km, sm.lead_time_days
  FROM (SELECT DISTINCT source_store_code, destination_store_code FROM dc_pack_inv) sc
  LEFT JOIN inventory_smart.store_to_store_transit sm
    ON sm.source_store_code      = sc.source_store_code
   AND sm.destination_store_code = sc.destination_store_code
)
,size_level_raw AS MATERIALIZED (
  SELECT
    dpi.article,
    dpi.size,
    dpi.source_store_code,
	dpi.original_source_store_code,
    dpi.destination_store_code,
    dpi.available_qty::numeric       AS source_inv_before,
    dpi.total_allocated_qty::numeric AS transfer_units,
    COALESCE(bt.oh,0)::numeric       AS destination_inv_before,
    bt.delivery_dt,
    bt.inventory_source,
	bt.min,
	bt.max,
	bt.demand,
	bt.wos
  FROM dc_pack_inv dpi
  JOIN base_table bt
    ON bt.article                = dpi.article
   AND bt.destination_store_code = dpi.destination_store_code
   AND bt.size                   = dpi.size
)
, attrs AS (
  SELECT
    paf.*,
    pr.source_store_code,
    pr.destination_store_code,
	  pr.original_source_store_code,
    -- product-level inventories & transfer units
    pr.source_inv_before        AS source_inv_before,
    pr.destination_inv_before        AS destination_inv_before,
    pr.transfer_units            ,
    pr.demand					 ,
    pr.min						,
    pr.max  					,
    pr.wos        				as current_wos,
	

    src_aid.wos_oh                AS source_wos_oh,
	  src_aid.oh 					  as source_inv_before_prod,
    dst_aid.wos_oh                AS destination_wos_oh,
	  dst_aid.oh 					  as destination_inv_before_prod,
	  dst_aid.wos_target       	  as destination_wos_target,
    -- prices
    src_aid.price                 AS source_price,
	COALESCE(src_fwos.ros, 0) AS source_ros_size,
    COALESCE(dst_fwos.ros, 0) AS destination_ros_size,
    COALESCE(src_fwos.wos_oh, 0) AS source_wos_oh_size,
    COALESCE(dst_fwos.wos_oh, 0) AS destination_wos_oh_size,

    -- store–store mapping
    sm.distance_km,
    sm.lead_time_days,

    -- store attributes
    source_saf.store_name         AS source_store_name,
    destination_saf.store_name    AS destination_store_name
    %s                             -- _src_store_cols (source custom attrs)
    %s                             -- _dst_store_cols (destination custom attrs)
  FROM size_level_raw pr
  LEFT JOIN store_mapping sm
    ON sm.source_store_code      = pr.source_store_code
   AND sm.destination_store_code = pr.destination_store_code

  LEFT JOIN paf
    ON paf.article = pr.article and paf.size=pr.size

  LEFT JOIN inventory_smart.fwos_sku_store_table src_fwos
    ON src_fwos.product_code = paf.product_code
   AND src_fwos.store_code   = pr.source_store_code

  LEFT JOIN inventory_smart.fwos_sku_store_table dst_fwos
    ON dst_fwos.product_code = paf.product_code
   AND dst_fwos.store_code   = pr.destination_store_code

  LEFT JOIN global.store_attributes_filter source_saf
    ON source_saf.store_code = pr.source_store_code

  LEFT JOIN global.store_attributes_filter destination_saf
    ON destination_saf.store_code = pr.destination_store_code

  LEFT JOIN inventory_smart.article_inventory_dashboard src_aid
    ON src_aid.article    = pr.article
   AND src_aid.store_code = pr.source_store_code

  LEFT JOIN inventory_smart.article_inventory_dashboard dst_aid
    ON dst_aid.article    = pr.article
   AND dst_aid.store_code = pr.destination_store_code
)
select * from  attrs;
   

  $SQL$,
    -- format args:
    _pm_date, _pm_date, p_allocation_code,
    _article_filter, _dst_filter, _src_filter,
    coalesce(_prod_attr_cols,''),

    coalesce(_src_store_cols,''),
    coalesce(_dst_store_cols,'')
  );
	RAISE NOTICE ' %',  _sql;
  OPEN p_cur FOR EXECUTE _sql;
  RETURN p_cur;
END;
$function$
;