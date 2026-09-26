--liquibase formatted sql
--changeset shreyansh.pandey:store_capacity_breach_v2 runOnChange:true stripComments:false splitStatements:false context:MTP-131067 labels:MTP-131067
--comment: MTP-130939 | Fix in net capacity
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.store_capacity_breach(input refcursor, character varying, character varying, character varying, character varying, character varying, character varying, jsonb, jsonb, jsonb, jsonb, boolean, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.store_capacity_breach(input refcursor, character varying, character varying, character varying, character varying, character varying, character varying, jsonb, jsonb, jsonb, jsonb, boolean, jsonb, character varying);

CREATE OR REPLACE FUNCTION inventory_smart.store_capacity_breach(input refcursor, character varying, character varying, character varying, character varying, character varying, character varying, jsonb, jsonb, jsonb, jsonb, boolean, jsonb, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/* 
  * Function/Procedure name: inventory_smart.store_capacity_breach
  * Created by: Mahaveer Kamuju
  * Created at: 16-DEC-2025
  * No of input parameter: 13
  * Parameter Description : $1 = Application name
  *                         $2 = Allocation Code
  *                             $3 = type
  *                             $4 = Store code
  *                             $5 = article filter
  *                             $6 = plan type based on source of allocation (dc,asn,ns,po)
								$7 =  pack config for the client (packs, eaches, both)
                                $8 = JSON for client specifc product attributes
                                $9 = JSON for client specifc store attributes
                                $10 = JSON for client specifc additional attributes
                                $11 = JSON for VIEW store capacity level and aggregations
                                $12 = Size order required
                                $13 = JSON for client specifc Gurobi attributes
								$14 = Ignore Allcation Code 
  * Purpose: 
  * This function is created to calculate Store View Allocation Summary which is displayed in the 
  * Finalize screen of Allocate flow
  * Calling Statement:
     begin;
    select * from inventory_smart.store_capacity_breach(
        'my_cur',
    	'6_251_CAN_20251216T052630',
    	'',
    	'',
    	'',
    	'dc',
    	'eaches',
    	'{"paf_select_str": ", l2_name, l3_name, l4_name, style_name ", "paf_group_by_str": ", l2_name, l3_name, l4_name, style_name ", "paf_final_select_str": ", l2_name, l3_name, l4_name, style_name", "paf_final_group_by_str": ", l2_name, l3_name, l4_name, style_name"}'::JSONB,
    	'{"saf_select_str": ", store_name_display, store_name, channel ", "saf_group_by_str": ", store_name_display, store_name, channel ", "saf_final_select_str": ", store_name_display, store_name, channel ", "saf_final_group_by_str": ", store_name_display, store_name, channel "}'::JSONB,
    	'{"add_select_str": " ", "add_group_by_str": " ", "add_final_select_str": "", "add_final_group_by_str": ""}'::JSONB,
    	'{"select_str_paf": "  l0_name, ", "join_str_scb": " on scb.product_hierarchy = paf.l0_name ", "fv_select_str": " size ", "fv_group_by_str": " size ","breached_stores_only": false}'::JSONB,
    	true,
    	'{}'::JSONB);
    fetch all from "my_cur";
     commit;
  * if any modification done in same function/procedure please record the changes in below format
  *
  * Updated_by       Updated_on      Purpose
  * ----------       -----------     --------
  *
  */

DECLARE
    _store_filter text;
    _article_filter text;
    _active_filter text;
	_pm_date date;
    _alloc_code text;
    _allocated_units_function TEXT;
    _available_units_function TEXT;
	_size_order_query TEXT;
	_size_order_join TEXT;
	_paf_join_condition TEXT;
	_paf_select_str TEXT;
	_paf_group_by_str TEXT;
	_paf_final_select_str TEXT;
	_paf_final_group_by_str TEXT;
	_saf_join_condition TEXT;
	_saf_select_str TEXT;
	_saf_group_by_str TEXT;
	_saf_final_select_str TEXT;
	_saf_final_group_by_str TEXT;
    _query text;
    _reserve_allocation_cte TEXT;
    _final_inv_query TEXT;
    _query_combine TEXT;
	v_gen_random_uuid text  := gen_random_uuid()::varchar;
    param_product_attr JSONB:= $8;
    param_store_attr JSONB:= $9;
    param_additional_metrics JSONB:= $10;
    param_capacity_level_attr JSONB:= $11;
	_size_order_req BOOLEAN := $12;
    param_gurobi_attr JSONB:= $13;
	param_pack_config_type TEXT:= $7 ;
	timezone TEXT;
	
BEGIN
    -- Determine source functions based on source_type parameter
			_paf_join_condition:= ' left join product_attributes paf using(article,size) ';
			_paf_select_str:= param_product_attr->>'paf_select_str';
			_paf_group_by_str:= param_product_attr->>'paf_group_by_str';
			_paf_final_select_str:= param_product_attr->>'paf_final_select_str';
			_paf_final_group_by_str:= param_product_attr->>'paf_final_group_by_str';
			_saf_join_condition:= 'left join store_attributes saf using(store_code)';
			_saf_select_str:= param_store_attr->>'saf_select_str';
			_saf_group_by_str:= param_store_attr->>'saf_group_by_str';
			_saf_final_select_str:= param_store_attr->>'saf_final_select_str';
			_saf_final_group_by_str:= param_store_attr->>'saf_final_group_by_str';
	
	-- Query to get the timezone from tenant_attribute_master table
    SELECT attribute_value::json->'value'->>'time_zone'
    INTO timezone
    FROM global.tenant_attribute_master
    WHERE name = 'tenant_time_config'
    LIMIT 1;


 IF timezone IS NULL THEN
     -- Fallback to previous default timezone to avoid invalid time zone errors
     timezone := 'America/New_York';
 END IF;
		_query :=  'select date(created_at) from inventory_smart.plan_master where plan_code = %L';
        if $14 = '' then 
            _alloc_code := $2;	 
        else
            _alloc_code := $14;
        end if; 
        _query := format(_query, _alloc_code);


    CASE UPPER($6)
        WHEN 'NS' THEN 
            _allocated_units_function := 'inventory_smart.sku_ns_allocated_units';
            _available_units_function := 'inventory_smart.sku_ns_available_units';
        WHEN 'PO' THEN 
            _allocated_units_function := 'inventory_smart.sku_po_allocated_units';
            _available_units_function := 'inventory_smart.sku_po_available_units';
        WHEN 'ASN' THEN 
            _allocated_units_function := 'inventory_smart.sku_asn_allocated_units';
            _available_units_function := 'inventory_smart.sku_asn_available_units';
        ELSE             
			_allocated_units_function := 'inventory_smart.sku_dc_allocated_units';
            _available_units_function := 'inventory_smart.sku_dc_available_units';
    END CASE;	


        execute _query into _pm_date;
        raise notice 'pm_date: %', _pm_date;
        if ($4 = '') IS FALSE
            then
                _store_filter := format($$ AND  carfs.store = '%s'$$, $4);
            end if;
        if ($5 = '') IS FALSE
            then
                _article_filter := format($$ AND carfs.article = '%s'$$, $5);
        end if;
        raise notice 'all variables created';
    -- Reserve allocation CTE (built separately to keep formatting simple)
	CASE 
		WHEN _size_order_req then
			_size_order_query:= format($fmt$
					,size_order_cte as materialized
					(
					SELECT 	
						article,
						elem ->> 'size'  AS size,
						max(elem ->> 'order') AS pack_size_order
					FROM inventory_smart.ph_master pm
					CROSS JOIN LATERAL jsonb_array_elements(to_jsonb(pm.product_code_size_map)) AS j(elem)
					where article in (select distinct article from dc_pack_config )
					group by 1,2 )
				$fmt$,
				_article_filter)
			;
			_size_order_join:= ' join size_order_cte USING(article,size)';
		ELSE 
			_size_order_query:= ''
			;
			_size_order_join:= '';
	END CASE;


    IF UPPER($6) NOT IN ('ASN','NS','PO') THEN
        _reserve_allocation_cte := $res$
        ,reserve_allocation as materialized(
            SELECT am.article, am."size", avg(COALESCE(b.quantity,0)) user_reserve_qty 
            FROM (
                SELECT dc_code, article, size, pack_type_id FROM dc_pack_config
                GROUP BY 1, 2, 3, 4
            ) am
            LEFT JOIN (
                SELECT * FROM inventory_smart.sku_dc_reserved_units 
                WHERE (article, dc_code::text) in (SELECT article, dc_code::text as dc_code FROM dc_pack_config)
            ) b
			on am.dc_code = b.dc_code::text and am.article = b.article and am.size = b.size and
            (am.pack_type_id = b.pack_type_id or am.size = b.pack_type_id)
            JOIN inventory_smart.dc_pack_configuration dpc 
            on am.article = dpc.article and b.pack_type_id = dpc.pack_type_id and am.size = dpc.size
            GROUP BY 1, 2
        )$res$;
    ELSE
        _reserve_allocation_cte := $res$
        ,reserve_allocation as materialized(    
            SELECT article, size, 0 as user_reserve_qty FROM dc_pack_config
            GROUP BY 1, 2
        )$res$;
    END IF;

        raise notice 'reserve CTE created';
    -- Build _final_inv_query using format with tagged dollar-quotes ($fmt$)
        _final_inv_query := format($fmt$
        current_available as materialized (
            SELECT am.article, am."size" ,coalesce(sum(b.oh),0) as oh
            FROM (SELECT article, size, pack_type_id, dc_code FROM dc_pack_config GROUP BY 1, 2, 3, 4) am 
            LEFT JOIN (SELECT * FROM %1$s ) b
			on am.dc_code = b.dc_code::text and am.article = b.article and am.size = b.size and
            (am.pack_type_id = b.pack_type_id or am.size = b.pack_type_id)
            GROUP BY 1, 2
        )%2$s
        ,other_allocations as materialized (
            select article, "size", sum(allocated_reserve_qty) allocated_reserve_qty from (
                SELECT  dc_code, article, "size", sum(allocated_reserve_qty) as allocated_reserve_qty
                FROM (
                    SELECT  am.dc_code, am.article, am.pack_type_id, am.size, 
                    b.quantity as allocated_reserve_qty
                    FROM (
                        SELECT dc_code::text as dc_code, article, pack_type_id, size, pack_type FROM dc_pack_config
                        GROUP BY 1, 2, 3, 4, 5
                    ) am
                    JOIN (  
                        select article, pack_type_id, size, dc_code, sum(quantity) as quantity 
                        from %3$s('%4$s') where allocation_code not in ('%4$s') 
                        group by article, pack_type_id, size, dc_code
                    ) b
                    --USING (dc_code, article, size, pack_type_id)
                    on am.dc_code = b.dc_code::text and am.article = b.article and am.size = b.size and
                    (am.pack_type_id = b.pack_type_id or am.size = b.pack_type_id)
                ) a
                GROUP BY 1, 2, 3
            ) c
            group by 1, 2
        )
        ,net_inv_count as materialized (
            select ssb.article, ssb."size",
				(COALESCE(avg(oh),0) - COALESCE(sum(total_allocated_qty),0) - COALESCE(avg(allocated_reserve_qty),0) - COALESCE(avg(user_reserve_qty),0))  as  net_dc_available, 
            	(COALESCE(avg(oh),0)  - COALESCE(avg(allocated_reserve_qty),0) - COALESCE(avg(user_reserve_qty),0))  as  bulk_dc_available,
            	COALESCE(avg(allocated_reserve_qty),0) as allocated_reserve_qty, 
				COALESCE(avg(user_reserve_qty),0) as user_reserve_qty
            from store_size_base ssb
            left join current_available ca using(article, "size")
            left join reserve_allocation ra using(article, "size")
            left join other_allocations oa using(article, "size")
            group by article, "size"
        )$fmt$,
        _available_units_function,
        _reserve_allocation_cte,
        _allocated_units_function,
        _alloc_code);
		_active_filter := $fmt$ AND active $fmt$;

        raise notice 'Final INV CTE created';
    
--    RAISE NOTICE '%', _final_inv_query;

    _query_combine := format($fmt$
        with base_table as materialized (
        	SELECT article, store as store_code, retail_size_cd as size, store_grade, delivery_dt, allocated_total, oh, oo, it, wos, oh_oo_intransit, ros,
        			pack_dc_allocation, min, max,  updated_oh_oo_it, demand, demand_type, inventory_source,
        			greatest(0,MIN - (updated_oh_oo_it)) as min_short, greatest(0, allocated_total - greatest(0, MIN - (updated_oh_oo_it))) as wos_allocation,
    				least(allocated_total,greatest(0,MIN - (updated_oh_oo_it))) as min_allocation
        	FROM inventory_smart.create_allocation_result_flat_gurobi carfs
        	-- WHERE created_at between '2025-09-16 00:00:00' and '2025-09-17 00:00:00' and allocation_code = '6_251_CAN_20250916T052630' 
			WHERE carfs.created_at between '%19$s'  and '%20$s'  and  allocation_code = '%18$s' %17$s %16$s
        )
        ,flat_table as materialized(
        	SELECT article,store_code,
        		   js.key::text dc_code, store_grade,
        		   UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated')::text, '[]', '{}'))::text[]) pack_type_id,
        		   UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) packs_allocated_qty,
        		   UNNEST((TRANSLATE((js.value::jsonb->>'packs_available_qty')::text, '[]', '{}'))::numeric[]) available_qty,
        		   UNNEST((TRANSLATE((js.value::jsonb->>'pack_rounding_factor')::text, '[]', '{}'))::numeric[]) pack_rounding_factor
        	FROM (
        		SELECT * FROM base_table 
        		) foo , JSONB_EACH(pack_dc_allocation) js group by 1,2,3,4,5,6,7,8)
        		
        ,dc_pack_config as materialized (
        	SELECT ft.article as parent_article, dpc.article, ft.dc_code, coalesce(dcs.name, ft.dc_code::text) as dc, ft.store_code, dpc.pack_type_id, dpc.size, dpc.pack_type, dpc.units_in_pack,
        	   ft.available_qty as available_qty_packs,store_grade, coalesce(dpc.pack_description::TEXT,dpc.pack_type_id::TEXT) as pack_description, 
        	   ft.packs_allocated_qty,
        	   ft.available_qty * dpc.units_in_pack::double precision AS  available_qty,
        	   ft.packs_allocated_qty * dpc.units_in_pack::double precision AS total_allocated_qty,
        	   coalesce(ft.pack_rounding_factor,1) as pack_rounding_factor
        FROM inventory_smart.dc_pack_configuration dpc
        JOIN flat_table as ft on  (dpc.pack_type_id = ft.article) or (dpc.article = ft.article and (dpc.pack_type_id = ft.pack_type_id or dpc.size = ft.pack_type_id))
        LEFT JOIN global.distribution_centres dcs 
		on ft.dc_code = dcs.dc_code::text 
        )
       ,dc_pack_inv as materialized(
        	select dc_code, dc, article, parent_article, store_code, pack_type_id, pack_type,size, units_in_pack,pack_rounding_factor,store_grade, pack_description,
			  sum(case when pack_type = 'eaches' then total_allocated_qty else 0 end) as loose_units_allocated,
			  avg(case when pack_type = 'packs' then packs_allocated_qty else 0 end) as pack_units_allocated,
        	  sum(total_allocated_qty) AS total_allocated_qty,
        	  avg(packs_allocated_qty) packs_allocated_qty
        from dc_pack_config p	
        group by 1,2,3,4,5,6,7,8,9,10,11,12
        )
		,product_attributes_filter as materialized (
    	SELECT *
    	FROM "global".product_attributes_filter
    	WHERE (article, size) IN (SELECT DISTINCT article, size FROM dc_pack_inv)
      	%22$s
		)
        ,store_size_base as materialized(
        	select %14$s article, parent_article, store_code, size, store_grade,
			 STRING_AGG(distinct case when pack_type = 'packs' then pack_type_id end, ',') as packs_allocated,
			 STRING_AGG(distinct case when pack_type = 'packs' then pack_description end, ',') as pack_description,
			 sum(total_allocated_qty) as total_allocated_qty , sum(packs_allocated_qty) as packs_allocated_qty,
			 sum(loose_units_allocated) as loose_units_allocated, sum(pack_units_allocated) as pack_units_allocated
        from dc_pack_inv p
		JOIN product_attributes_filter paf USING (article,"size")
		group by %14$s article, parent_article, store_code, size, store_grade
        )
		,%1$s
		
		,store_dept_inv as materialized(
                SELECT
					%14$s
                    store_code
					,COALESCE(SUM(oh), 0) as oh,
 					COALESCE(SUM(it), 0) as oo,
					COALESCE(SUM(oo), 0) as it,
                    COALESCE(SUM(oh), 0) + COALESCE(SUM(it), 0) + COALESCE(SUM(oo), 0) as store_inv
                FROM inventory_smart.latest_inventory li
                JOIN global.product_attributes_filter paf USING (product_code)
                GROUP BY  %14$s  store_code
            )
            --select * from store_dept_inv;
--			,store_old_alloc as (
--            	select 
--					%14$s
--            		store as store_code
--            		,COALESCE(sum(allocated_total),0) as old_alloc
--            	FROM inventory_smart.create_allocation_result_flat_gurobi carfs
--				JOIN inventory_smart.plan_master pm ON carfs.allocation_code::text = pm.plan_code::text
--				join product_attributes_filter paf on carfs.article = paf.article and carfs.retail_size_cd = paf.size
--				WHERE pm.created_at >= (date((now() AT TIME ZONE 'America/New_York'::text))::timestamp without time zone AT TIME ZONE 'America/New_York'::text) AND pm.created_at <= ((date((now() AT TIME ZONE 'America/New_York'::text))::timestamp without time zone AT TIME ZONE 'America/New_York'::text) + '23:59:59'::interval) AND (pm.status = ANY (ARRAY[2, 3])) AND pm.is_deleted = false 
--				and allocation_code != '%18$s'
--				GROUP BY  %14$s  store
--			)
			,store_old_alloc as materialized(
			    select 
        		%14$s
        		store as store_code
        		,COALESCE(sum(allocated_total),0) as old_alloc
    			FROM inventory_smart.create_allocation_result_flat_gurobi carfs
    			JOIN inventory_smart.plan_master pm ON carfs.allocation_code::text = pm.plan_code::text
    			JOIN global.product_attributes_filter paf on carfs.article = paf.article and carfs.retail_size_cd = paf.size
    			WHERE carfs.created_at >= (date((now() AT TIME ZONE '%30$s'::text))::timestamp without time zone AT TIME ZONE '%30$s'::text)
     			 AND carfs.created_at < (date((now() AT TIME ZONE '%30$s'::text))::timestamp without time zone AT TIME ZONE '%30$s'::text) + interval '1 day'
     			 AND pm.created_at >= (date((now() AT TIME ZONE '%30$s'::text))::timestamp without time zone AT TIME ZONE '%30$s'::text) 
     			 AND pm.created_at < (date((now() AT TIME ZONE '%30$s'::text))::timestamp without time zone AT TIME ZONE '%30$s'::text) + interval '1 day'
     			 AND (pm.status = ANY (ARRAY[2, 3])) 
      			 AND pm.is_deleted = false 
     			 AND carfs.allocation_code != '%18$s'
   			 	GROUP BY  %14$s  store
			)
			--select * from store_old_alloc;
            ,store_capacity as materialized(
				SELECT 
					%14$s
                    store_code,
					SUM(unit_capacity) as unit_capacity
				FROM
				(
                SELECT
					DISTINCT
					%14$s
                    store_code,
					unit_capacity
                FROM inventory_smart.store_unit_capacity scb
				JOIN product_attributes_filter paf
				%15$s
                WHERE store_code in (
                    SELECT DISTINCT store_code 
                    FROM store_size_base
                ) 
				) a
				group by %14$s store_code
            )
            --select * from store_capacity;
            ,store_allocations as materialized(
                SELECT
					%14$s
                    store_code
                    ,SUM(total_allocated_qty) total_allocated_qty
                FROM store_size_base
               	GROUP BY  %14$s  store_code
            )
            --select * from store_allocations;
            ,capacity_breach as materialized(
				select * from 
				(
            	SELECT
					%14$s
                	store_code,
                  	total_allocated_qty,
                  	unit_capacity,
					coalesce(oh,0) as oh,
					coalesce(oo,0) as oo,
					coalesce(it,0) as it,
                    COALESCE(old_alloc, 0) AS old_alloc,
                    (COALESCE(store_inv,0) + COALESCE(old_alloc, 0)) as store_inv,
					ROUND(((COALESCE(store_inv,0) + COALESCE(old_alloc, 0)) * 1.0 / NULLIF(unit_capacity, 0))::numeric, 2) AS prong_density_pre,
					ROUND(((COALESCE(store_inv,0) + COALESCE(old_alloc, 0) + COALESCE(total_allocated_qty,0)) * 1.0 / NULLIF(unit_capacity, 0))::numeric, 2) AS prong_density_post,
					COALESCE(unit_capacity, 0) - COALESCE(store_inv, 0) - COALESCE(total_allocated_qty, 0) - coalesce(old_alloc, 0) as net_capacity
             	FROM store_allocations
               	LEFT JOIN store_dept_inv USING( %14$s store_code)
               	LEFT JOIN store_capacity USING( %14$s store_code)
                left join store_old_alloc using( %14$s store_code)
				) a
				WHERE CASE WHEN %29$s THEN net_capacity < 0  ELSE TRUE END
            )

    	, product_attributes as materialized (
    	select article, "size" %2$s
    	from product_attributes_filter paf
		where article in (select distinct article from dc_pack_config ) %22$s
    	group by article, "size" %3$s
    	)
    	, store_attributes as materialized (
    	select store_code %6$s
    	from global.store_attributes_filter saf
		where store_code in (select distinct store_code from dc_pack_config )
    	group by store_code %7$s
    	)

		,wos_calcuations as materialized(
            SELECT 
                    article,
                    store_code,
                    ROUND(coalesce((SUM(demand * current_wos) / nullif(SUM(demand), 0))::numeric,0), 2) as fwos,
                    ROUND(MAX(wos)::numeric, 2) as twos
            FROM (
               SELECT 
                   article, store_code,wos, demand, (allocated_total + oh_oo_intransit) / nullif(ros, 0) AS current_wos
                    FROM base_table
                    JOIN store_size_base USING(article, store_code, size)
                ) foo
                GROUP BY 1, 2
        )
		
		,sales_aggregate as materialized(
			select 
				article,
				store_code
				 %10$s  --format and replace it with config
            from (select distinct article, store_code from dc_pack_config ) a
            left join inventory_smart.article_inventory_dashboard aid using(article, store_code)
            group by article, store_code %11$s
        )
        , gurobi_metrics_article_store as materialized(
        	select article,store_code, avg(wos) as wos
        	from base_table
        	group by  article,store_code
        )
		
		%23$s

            SELECT
				%27$s
				%4$s
				%8$s
				%12$s
				,store_code,
				article,
				als.parent_article,
                COALESCE(AVG(prong_density_post)::numeric,0) as prong_density_post,
                COALESCE(AVG(prong_density_pre)::numeric,0) as prong_density_pre,
				COALESCE(AVG(unit_capacity)::numeric,0) as unit_capacity ,
                COALESCE(AVG(store_inv)::numeric,0) as oh_it_oo,
                COALESCE(AVG(oh)::numeric,0) as oh,
                COALESCE(AVG(oo)::numeric,0) as oo,
                COALESCE(AVG(it)::numeric,0) as it,
				COALESCE(AVG(gmas.wos)::numeric,0) as wos ,
                COALESCE(AVG(old_alloc)::numeric,0) as old_alloc,
                COALESCE(MAX(net_capacity)::numeric,0) as net_capacity,
                COALESCE(AVG(fi.net_dc_available)::numeric,0) as net_available,
				COALESCE(AVG(fi.bulk_dc_available)::numeric,0) as dc_available,
                COALESCE(AVG(fi.user_reserve_qty)::numeric,0) as user_reserve_qty,
                COALESCE(AVG(fi.allocated_reserve_qty)::numeric,0) as allocated_reserve_qty,
                COALESCE(AVG(fwos)::numeric,0) as fwos,
                COALESCE(AVG(twos)::numeric,0) as twos,
                COALESCE(SUM(als.total_allocated_qty)::numeric,0) allocated_qty,
                MAX(als.packs_allocated)::text packs_allocated,
                MAX(als.pack_description)::text pack_description,
                COALESCE(SUM(als.pack_units_allocated)::numeric,0) pack_units_allocated,
                COALESCE(SUM(als.loose_units_allocated)::numeric,0) loose_units_allocated
            FROM store_size_base als
            JOIN capacity_breach cb USING( %14$s store_code)
            LEFT JOIN net_inv_count fi USING (article,"size") 
        	left join sales_aggregate sa using(article,store_code)
        	left join gurobi_metrics_article_store gmas using(article,store_code)
            LEFT JOIN wos_calcuations USING(article, store_code)
			%24$s
			%25$s
			%26$s
            group by %28$s %5$s %9$s %13$s  , store_code, article, als.parent_article

    	$fmt$, 
		_final_inv_query,   --1
		_paf_select_str, --2
    	_paf_group_by_str, --3
    	_paf_final_select_str,  --4
    	_paf_final_group_by_str,  --5
		_saf_select_str, --6
    	_saf_group_by_str, --7
    	_saf_final_select_str, --8
    	_saf_final_group_by_str, --9
		param_additional_metrics->>'add_select_str', --10
    	param_additional_metrics->>'add_group_by_str', --11
    	param_additional_metrics->>'add_final_select_str',  --12
    	param_additional_metrics->>'add_final_group_by_str', --13
		param_capacity_level_attr->>'select_str_paf', --14
		param_capacity_level_attr->>'join_str_scb', --15
        _article_filter, --16
        _store_filter, --17
        $2, --18
        _pm_date::timestamp , --19
		_pm_date::timestamp + interval '1 day'--20
		,param_pack_config_type, -- 21
		_active_filter, -- 22
		_size_order_query, --23
		_size_order_join, -- 24
		_paf_join_condition, -- 25
		_saf_join_condition, --26
		param_capacity_level_attr->>'fv_select_str', -- 27	
		param_capacity_level_attr->>'fv_group_by_str', -- 28
		param_capacity_level_attr->>'breached_stores_only', --29
		timezone -- 30 client specific timezone
    );

   	RAISE NOTICE ' %',  _query_combine;
    OPEN $1 FOR execute _query_combine;  
	 perform  global.sp_log(v_gen_random_uuid,'inventory_smart.store_capacity_breach', 'Before Return',_query_combine,jsonb_build_object('allocation_code', $2,'store_code' , $3, 'Article code/SKU code', $4, 'ignore_allocation_code', $5,'type',$6));
     RETURN $1;
END;
$function$
;
