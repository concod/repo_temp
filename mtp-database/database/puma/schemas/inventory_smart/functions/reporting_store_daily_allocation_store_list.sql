--liquibase formatted sql
--changeset liquibase:reporting_store_daily_allocation_store_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for reporting_store_daily_allocation_store_list
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
 		WITH product_master_filters_data AS (
 			    SELECT 
 			    	paf.article,
			    	store_code,
					saf.store_name,
					saf.store_id,
					carfg.retail_size_cd,
					carfg.allocation_code,
					coalesce(max(carfg.min), 0) as min_constraints,
					coalesce(max(carfg.allocated_total),0) as unit_allocated,  -- sum(units_allocated*COALESCE(units_in_pack, 1)) units_allocated,
					coalesce(max(it),0) as it,
					coalesce(max(oh),0) as oh,
					coalesce(max(oo),0) as oo
 				FROM (select article, size, product_code FROM global.product_attributes_filter  ' || _query_pa || ') paf
 			    join global.product_mapping_product_store pmps
 			    using(product_code)
 			    join (select store_name,store_id, store_code FROM global.store_attributes_filter ' || _query_sa || ') saf 
 			    using(store_code)
 				join inventory_smart.create_allocation_result_flat_gurobi carfg on carfg.article  = paf.article
 				--and carfg.retail_size_cd = paf.size
 				and carfg.store = saf.store_code
 				join inventory_smart.plan_master pm on pm.plan_code = carfg.allocation_code
 				where (pm.updated_at AT TIME ZONE ''EST'')::date = ''' || $4 || ''' and pm.status = 3 
				group by 1,2,3,4,5,6
 			),
			min_unit_allocated as (
				select 
					paf.*,
					LEAST(min_constraints, unit_allocated) as min_allocation,
					GREATEST(0, unit_allocated - LEAST(min_constraints, unit_allocated)) as wos_allocation
				from 
					product_master_filters_data	paf
				)	
	 		select 
				paf.store_code,
				paf.store_id, 
				paf.store_name,
				sum(unit_allocated) as unit_allocated,
				sum(min_allocation) as min_allocation,
				sum(wos_allocation) as wos_allocation,
				sum(it) as it,
				sum(oh) as oh,
				sum(oo) as oo
			 from min_unit_allocated paf
			 group by 1,2,3';
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
 	RETURN $1;
  	end
 $function$
;
