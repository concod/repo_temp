--liquibase formatted sql
--changeset liquibase:lovisa_order_batching_summary_timezone_correction_v2 runOnChange:true stripComments:false splitStatements:false context:MTP-56248 labels:MTP-56248
--comment: Updated timezone to Australia/Melbourne with corrected timezone handling pattern - apply AT TIME ZONE directly to timestamp columns, added materialized to CTEs | slowness fix
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.order_batching_summary(input, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.order_batching_summary(input refcursor, jsonb, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /* 
  * Function/Procedure name: inventory_smart.order_batching_summary
  * Created by: Suba Selvandran N
  * Created at: 27-June-2023
  * Updated by: AI Assistant
  * Updated at: 2025-01-15
  * Purpose: Simplified summary focusing on specific columns for Lovisa
  * 
  * Output Columns:
  * - DC Name (dc.name)
  * - Store ID (store)
  * - Store Name (store_name)
  * - Allocated Qty. (sum of allocated_total)
  * - #Refs (count distinct l4_name/product_code)
  * - # Allocations (count distinct allocation_code)
  * - Current Available to Allocate (dc_net_available_inventory)
  * 
  * Key Changes:
  * - 7 days lookback instead of 30 days
  * - Only DC allocation flow (inventory_source = 'dc')
  * - Use dc_pack_reserve_quantity_derived_table for reserve
  * - #Refs now counts distinct l4_name instead of articles
  */
declare
    _query_combine text;
    _allocation_type_filter text;
    _query_pa      text:='';
    _query_sa      text:='';
    _query_cus     text:='';
    v_gen_random_uuid text  := gen_random_uuid()::varchar;
    begin
    _query_pa  := inventory_smart.form_main_table_filters('product_attributes_filter', $2);
    _query_sa  := inventory_smart.form_main_table_filters('store_attributes_filter', $3);
    _query_cus := inventory_smart.form_main_table_filters('', $4);
    _query_combine := format($$
        WITH
		product_filters AS materialized (
			SELECT DISTINCT article, l4_name FROM
			global.product_attributes_filter %1$s
		)
		,store_filters AS materialized (
			SELECT DISTINCT store_code FROM
			global.store_attributes_filter %2$s                
		),
		plan_master AS materialized (
		    SELECT 
		    	plan_code,
	            plan_code as allocation_name,
	            created_at,
	            type as plan_type
		    FROM inventory_smart.plan_master
		    WHERE status IN (2)
		    AND is_deleted = false
		    AND (
		        type IN (4, 5)
		        OR (
		            type IN (0, 2)
		            AND updated_at AT TIME ZONE 'Australia/Melbourne' >= (CURRENT_DATE AT TIME ZONE 'Australia/Melbourne')
		            AND updated_at AT TIME ZONE 'Australia/Melbourne' < (CURRENT_DATE AT TIME ZONE 'Australia/Melbourne' + INTERVAL '1 day')
		        )
		    )
			AND created_at AT TIME ZONE 'Australia/Melbourne' >= (CURRENT_DATE AT TIME ZONE 'Australia/Melbourne' - INTERVAL '7 days')
			AND created_at AT TIME ZONE 'Australia/Melbourne' < (CURRENT_DATE AT TIME ZONE 'Australia/Melbourne' + INTERVAL '1 day')
		)
		,filter_allocations_pre as materialized (
        	select * from (
        	select 
        		carfg.*,
        		CASE
			      WHEN inventory_source='dc' THEN 'B'
			      WHEN inventory_source='po' THEN 'L'
			      WHEN inventory_source='ns' THEN 'S'
			      ELSE ''
			  	END
			    AS po_type,
			    CASE
			      WHEN plan_type in (0, 4, 5) THEN 'Manual'
			      ELSE 'Auto'
			  	END
			    AS allocation_type,
			    plm.allocation_name
        	from inventory_smart.create_allocation_result_flat_gurobi AS carfg
			INNER JOIN plan_master plm ON plm.plan_code = carfg.allocation_code
			where
				exists (select 1 from product_filters paf where paf.article = carfg.article)
  				-- Removed: AT TIME ZONE conversion on created_at disables partition pruning on carfg, causing full table scan and slowness.
				-- The plan_master CTE already enforces the 7-day created_at lookback, so this filter is redundant.
				--AND carfg.created_at AT TIME ZONE 'Australia/Melbourne' >= (CURRENT_DATE AT TIME ZONE 'Australia/Melbourne' - INTERVAL '7 days')
			    --AND carfg.created_at AT TIME ZONE 'Australia/Melbourne' <  (CURRENT_DATE AT TIME ZONE 'Australia/Melbourne' + INTERVAL '1 day')
		) a %3$s
        )
		,filter_allocations as materialized (
        	select *
        	from filter_allocations_pre a
        	where exists (select 1 from store_filters sf where sf.store_code = a.store)
        ),
		allocation_unpack as materialized (
				SELECT
					js.key as dc_code,
					store,
					store_name,
					allocated_total,
					style,
					allocation_code,
					inv_avai AS dc_available,
					article,
					retail_size_cd as size,
					pack_data.pack_type_id,
					pack_data.packs_allocated_qty,
					pack_data.packs_available_qty
				FROM
					filter_allocations
					CROSS JOIN LATERAL jsonb_each(pack_dc_allocation) js
					CROSS JOIN LATERAL (
						SELECT 
							UNNEST((TRANSLATE((js.value->>'packs_allocated')::text, '[]', '{}'))::text[]) AS pack_type_id,
							UNNEST((TRANSLATE((js.value->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) AS packs_allocated_qty,
							UNNEST((TRANSLATE((js.value->>'packs_available_qty')::text, '[]', '{}'))::numeric[]) AS packs_available_qty
					) pack_data
		),
		allocation_base AS (
			select a.* ,
			a.packs_allocated_qty AS allocated_qty,
			a.packs_available_qty AS available_qty
			from allocation_unpack a
		),
		reserved_units AS materialized (
		    SELECT
		        article,
		        COALESCE(SUM(quantity), 0) AS reserve_quantity
		    FROM
		        inventory_smart.sku_dc_reserved_units a
		    WHERE
		        exists (select 1 from filter_allocations b where b.article = a.article)
		    GROUP BY article
		),
		dc_inv as materialized (
			select 
				dc_code,
				sum(available_qty) as available_qty,
				SUM(allocated_qty) as allocated_qty
			from (
				select 
					article,
					dc_code,
					pack_type_id,
					size,
					AVG(available_qty) as available_qty,
					SUM(allocated_qty) as allocated_qty
				from allocation_base
				GROUP BY 1, 2, 3, 4
			) a
			group by 1
		)
		SELECT
		    dc."name" AS "dc_name",
		    a.store AS "store",
		    a.store_name AS "store_name",
		    coalesce(SUM(a.allocated_qty), 0) AS "allocated_qty",
		    COUNT(DISTINCT pf.l4_name) AS "refs_count",
		    COUNT(DISTINCT a.allocation_code) AS "allocations_count",
		    GREATEST(AVG(di.available_qty) - AVG(di.allocated_qty) - AVG(coalesce(ru.reserve_quantity,0)), 0) AS "dc_net_available_inventory"
		FROM
		    allocation_base a
		join dc_inv di using (dc_code)
		left join "global".distribution_centres dc on dc.dc_code::text = a.dc_code::text
		LEFT JOIN reserved_units ru ON a.article = ru.article
		LEFT JOIN product_filters pf ON pf.article = a.article
		GROUP BY 
		    dc."name",
		    a.store, 
		    a.store_name,
			a.dc_code
    $$, _query_pa, _query_sa, _query_cus);
    raise notice '%', _query_combine;
    OPEN $1 FOR execute _query_combine;  
	perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.order_batching_summary', 'Before returning function value',_query_combine,jsonb_build_object('product filters str',$2,'store filters str',$3,'other filters str',$4)) ;		
    RETURN $1;
    end
$function$
;