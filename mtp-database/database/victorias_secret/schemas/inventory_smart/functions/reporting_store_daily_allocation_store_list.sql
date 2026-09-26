--liquibase formatted sql
--changeset liquibase:reporting_store_daily_allocation_store_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0_2 labels:MTP-22135, MTP-22134, MTP-22133
--comment: added missing column
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_store_daily_allocation_store_list(input refcursor, jsonb, jsonb, date);
CREATE OR REPLACE FUNCTION inventory_smart.reporting_store_daily_allocation_store_list(input refcursor, jsonb, jsonb, date)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 #variable_conflict use_column
 declare
 _query_pa text := '';
 _query_sa text := '';
 _allocation_date text := $4;
 _query_table_filters text := '';
 _query_combine text := '';
 _cache_payload jsonb := jsonb_build_object('product_attributes', $2, 'store_attributes', $3, 'allocation_date', $4);
 _cache_table_id text;
 _cache_schema text := 'inventory_smart';
 _cache_sp text := '.reporting_store_daily_allocation_store_list';
 _cache_key_pattern text := '{schema_name}:{sp_name}:{request}';
 _cache_dependencies text[] := '{inventory_smart.create_allocation_result_flat_gurobi, inventory_smart.plan_master}';
 v_gen_random_uuid text  := gen_random_uuid()::varchar;
 begin
 	_query_pa := global.form_main_table_filters(
 	  'product_attributes_filter',
 	  $2
 	);
 	_query_sa := global.form_main_table_filters(
 	  'store_attributes_filter',
 	  $3
 	);
 	_query_combine := '
 		WITH allocation_cte AS
            (
                SELECT  paf.l6_id
                    ,paf.l6_name
					,saf.store_code as store_number
                    ,saf.store_name
                    ,carfg.article
                    ,carfg.store
                    ,carfg.allocation_code
                    ,pm.name as allocation_plan_name
                    ,carfg.retail_size_cd                                                                                              AS size
                    ,carfg.pack_dc_allocation
                    ,LEAST(carfg.allocated_total::int,GREATEST(0,carfg.min::int - carfg.oh_oo_intransit::int))                         AS min_units_allocated
                    ,carfg.allocated_total - LEAST(carfg.allocated_total::int,GREATEST(0,carfg.min::int - carfg.oh_oo_intransit::int)) AS wos_units_allocated
					,carfg.oh
                    ,carfg.oo
                    ,carfg.it
                    ,carfg.oh_oo_intransit
                FROM inventory_smart.create_allocation_result_flat_gurobi carfg
                JOIN
                (
                    SELECT  distinct article, l6_id, l6_name
                    FROM global.product_attributes_filter 
                    ' || _query_pa || '
                ) paf
                ON paf.article = carfg.article
                JOIN
                (
                    SELECT  store_code, store_name
                    FROM global.store_attributes_filter
                    ' || _query_sa || '
                ) saf
                ON saf.store_code = carfg.store
                JOIN
                (
                    SELECT  plan_code, name
                    FROM inventory_smart.plan_master 
                    WHERE (created_at AT TIME ZONE ''America/New_York'')::date = (' || quote_literal(_current_date) || ')::date 
                    AND status = 3 
                    AND is_deleted = false
                ) pm
                ON pm.plan_code = carfg.allocation_code
            ) 
            , flat_allocation_cte AS
            (
                select * 
                from 
                (
	            	SELECT  *
	                    ,js.key AS dc_code
	                    ,UNNEST((TRANSLATE((js.value::jsonb->>''packs_allocated'')::text,''[]'',''{}''))::text[]) pack_type_id
	                    ,UNNEST((TRANSLATE((js.value::jsonb->>''packs_allocated_qty'')::text,''[]'',''{}''))::numeric[]) packs_allocated_qty
	                    ,UNNEST((TRANSLATE((js.value::jsonb->>''packs_available_qty'')::text,''[]'',''{}''))::numeric[]) packs_available_qty
	                FROM allocation_cte, jsonb_each(allocation_cte.pack_dc_allocation) AS js
                ) a
                where pack_type_id = size 
            )
            , flat_allocation_cte2 AS
            (
                SELECT  *
                FROM
                (
                    SELECT  fa.*
                        ,coalesce(units_in_pack,1)                                                                             AS units_in_pack
                        ,packs_available_qty::integer * COALESCE(units_in_pack::integer,1)                                     AS available_qty
                        ,packs_allocated_qty::integer * COALESCE(units_in_pack::integer,1)                                     AS allocated_qty
                    FROM flat_allocation_cte fa
                    LEFT JOIN inventory_smart.dc_pack_configuration dpc 
                    USING (article, pack_type_id, size)
                ) a
                WHERE allocated_qty > 0
            )
            , final_cte1 as (
	            select  store_number
	            	,store_name
	            	,sum(oh) as oh
	            	,sum(oo) as oo
	            	,sum(it) as it
	            	,sum(total_inventory) as total_inventory
	            	,sum(min_units_allocated) as min_units_allocation
	            	,sum(wos_units_allocated) as wos_units_allocation
	            from
	            (
		            select  store_number
		            	,store_name
		            	,article
		            	,size
		            	,max(oh) as oh
		            	,max(oo) as oo
		            	,max(it) as it
		            	,max(oh_oo_intransit) as total_inventory
		            	,sum(min_units_allocated) as min_units_allocated
		            	,sum(wos_units_allocated) as wos_units_allocated
		            from allocation_cte
		            group by store_number, store_name, article, size
	            ) a
	            group by store_number, store_name
            )
            , final_cte2 as (
				select  store_number
					, sum(allocated_qty) as units_allocated
	            from flat_allocation_cte2
				group by store_number
			)
			select  *
				,store_number AS key
			from final_cte1
			join final_cte2 using (store_number);
	';
 	raise notice '%',_query_combine;
 	select * from cache.wrap_sp(
 			_cache_schema,
 			_cache_sp,
 			_cache_payload,
 			_query_combine,
 			_cache_dependencies,
 			_cache_key_pattern) into _cache_table_id;
 	perform set_config('myvars.cache_table_id', _cache_table_id, true);
 	open $1 for execute 'select * from "cache"."' || _cache_table_id || '" X ';
	perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.reporting_store_daily_allocation_store_list', 'Before Return',_query_combine,jsonb_build_object('product_attributes', $2, 'store_attributes', $3, 'allocation_date', $4));	
	perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.reporting_store_daily_allocation_store_list', 'Before Return','select * from "cache"."' || _cache_table_id || '" X ',jsonb_build_object('product_attributes', $2, 'store_attributes', $3, 'allocation_date', $4));	
 	RETURN $1;
  	end
 $function$
;