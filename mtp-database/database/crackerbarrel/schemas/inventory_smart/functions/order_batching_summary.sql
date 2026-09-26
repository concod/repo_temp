--liquibase formatted sql
--changeset liquibase:order_batching_summary runOnChange:true stripComments:false splitStatements:false context:MTP-56248 labels:MTP-56248
--comment: Optimize order batching summary remove store_capacity 
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
  * No of input parameter: 4
  * Parameter Description : $1 = cursor
  *                         $2 = product filters str
                            $3 = store filters str
                            $4 = other filters str
  * if any modification done in same function/procedure please record the changes in below format
  *
  * Updated_by       Updated_on      Purpose
  * ----------       -----------     --------
  *
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
		product_filters AS (
			SELECT article FROM
			global.product_attributes_filter %1$s
		)
		,store_filters AS materialized (
			SELECT store_code FROM
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
		    AND (type in (4, 5) or (type in (0, 2) and updated_at between (Date(now() AT TIME ZONE 'America/New_York')::timestamp AT TIME ZONE 'America/New_York') and (Date(now() AT TIME ZONE 'America/New_York')::timestamp AT TIME ZONE 'America/New_York' + interval '1 day')))
			AND created_at >= (Date(now() AT TIME ZONE 'America/New_York' - interval '14 day')::timestamp )
AND created_at <= (date(now() AT TIME ZONE 'America/New_York' + interval '1 day')::timestamp)
		)
		,filter_allocations as (
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
					article IN (SELECT article FROM product_filters)
					AND store IN (SELECT store_code FROM store_filters)
            ) a %3$s
        ),
		allocation_unpack as (
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
					pack_data.packs_available_qty,
					pack_data.pack_rounding_factor
				FROM
					filter_allocations
					CROSS JOIN LATERAL jsonb_each(pack_dc_allocation) js
					CROSS JOIN LATERAL (
						SELECT 
							UNNEST((TRANSLATE((js.value->>'packs_allocated')::text, '[]', '{}'))::text[]) AS pack_type_id,
							UNNEST((TRANSLATE((js.value->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) AS packs_allocated_qty,
							UNNEST((TRANSLATE((js.value->>'packs_available_qty')::text, '[]', '{}'))::numeric[]) AS packs_available_qty,
							UNNEST((TRANSLATE((js.value->>'pack_rounding_factor')::text, '[]', '{}'))::numeric[]) AS pack_rounding_factor
					) pack_data
		),
		allocation_base as materialized (
			select a.* ,
				case when pack_type ='eaches' then
					a.packs_allocated_qty * (COALESCE(a.pack_rounding_factor,1)::integer) else
					a.packs_allocated_qty * (COALESCE(dpc.units_in_pack,1)::integer)
				end as allocated_qty
			from allocation_unpack a
			JOIN inventory_smart.dc_pack_configuration dpc USING (article, pack_type_id, size)
		),
		reserved_units AS materialized (
			SELECT
				dc_code,
				COALESCE(SUM(quantity), 0) AS reserve_quantity
			FROM
				inventory_smart.dc_pack_reserve_quantity
			WHERE
				article IN (
					select
                        article
                    from
                        filter_allocations
                    group by 1
				)
			GROUP BY dc_code
		),
		base_dc_article AS materialized (
    		SELECT dc_code, article
    		FROM allocation_base
    		group by 1, 2
		),
		allocated_units AS materialized (
    		SELECT
        		dc_code,
        		article,
        		SUM(quantity) AS quantity
    		FROM (
        		SELECT dc_code::text, article, quantity
        		FROM inventory_smart.sku_dc_allocated_units
        		UNION ALL
        		SELECT dc_code::text, article, quantity
        		FROM inventory_smart.sku_po_allocated_units
    		) x
    		GROUP BY dc_code, article
		),
		old_allocation as materialized(
			SELECT
				b.dc_code, 
				COALESCE(SUM(a.quantity), 0) AS quantity
			from base_dc_article b
			LEFT JOIN allocated_units a
        	ON a.dc_code = b.dc_code AND a.article = b.article
    		GROUP BY b.dc_code
		),
		available_units AS materialized (
    		SELECT
        		dc_code,
        		article,
        		SUM(oh)     AS quantity_oh,
        		SUM(oh_oo)  AS quantity_oh_oo
    		FROM (
        		SELECT dc_code::text, article, oh, oh_oo
        		FROM inventory_smart.sku_dc_available_units
        		UNION ALL
        		SELECT po_code::text AS dc_code, article, oh, oh
        		FROM inventory_smart.sku_po_available_units
    		) x
    		GROUP BY dc_code, article
		),
		avail_inv as materialized(
			select
				b.dc_code, 
				COALESCE(SUM(v.quantity_oh), 0) AS quantity_oh,
				COALESCE(SUM(v.quantity_oh_oo), 0) AS quantity_oh_oo
			from base_dc_article b
    		LEFT JOIN available_units v
        	ON v.dc_code = b.dc_code AND v.article = b.article
    		GROUP BY b.dc_code
		)
		SELECT
		    coalesce(SPLIT_PART(dc.linked_store_code, '_', 1), a.dc_code) AS dc_code,
		    dc."name",
		    a.store,
		    a.store_name,
		    coalesce(SUM(a.allocated_qty), 0) AS allocated_total,
		    COUNT(DISTINCT a.article) AS style_count,
		    COUNT(DISTINCT a.allocation_code) AS allocation_count,
		    GREATEST(AVG(avail.quantity_oh) - AVG(oalloc.quantity) - COALESCE(AVG(ru.reserve_quantity), 0), 0) AS dc_net_available_inventory_oh,
		    GREATEST(AVG(avail.quantity_oh_oo) - AVG(oalloc.quantity) - COALESCE(AVG(ru.reserve_quantity), 0), 0) AS dc_net_available_inventory_oh_oo
		from allocation_base a
		left join old_allocation oalloc using (dc_code)
		left join avail_inv avail using (dc_code)
		left join "global".distribution_centres dc on dc.dc_code::text = a.dc_code::text
		LEFT JOIN reserved_units ru ON a.dc_code::text = ru.dc_code::text
		GROUP BY 
		    dc.linked_store_code,
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
