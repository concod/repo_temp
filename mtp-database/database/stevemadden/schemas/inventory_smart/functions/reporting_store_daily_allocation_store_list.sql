--liquibase formatted sql
--changeset liquibase:reporting_store_daily_allocation_store_list_MTP-57254_MTP-61589 runOnChange:true stripComments:false splitStatements:false context:Release_1_1_4 labels:MTP-57254_MTP-61589
--comment: Added missing columns
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_store_daily_allocation_store_list(refcursor, jsonb, jsonb, date);
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
			    	carfg.store as store_code,
					saf.store_name,
					carfg.retail_size_cd,
					carfg.allocation_code,
					carfg.allocated_total,
					carfg.min,
					carfg.updated_oh_oo_it,
					coalesce(max(carfg.allocated_total),0) as unit_allocated,  -- sum(units_allocated*COALESCE(units_in_pack, 1)) units_allocated,
					coalesce(max(it),0) as it,
					coalesce(max(oh),0) as oh,
					coalesce(max(oo),0) as oo,
					greatest(0,allocated_total - greatest(0,MIN - (updated_oh_oo_it))) AS wos_allocation,
                	least(allocated_total,greatest(0,MIN - (updated_oh_oo_it)))        AS min_allocation
 				FROM (select article, size, product_code FROM global.product_attributes_filter  ' || _query_pa || ') paf
 			    --join global.product_mapping_product_store pmps
 			    --using(product_code)
 			    
 				join inventory_smart.create_allocation_result_flat_gurobi carfg on carfg.article  = paf.article
 				and carfg.retail_size_cd = paf.size
 				--and carfg.store = saf.store_code
				join (select store_name, store_code FROM global.store_attributes_filter ' || _query_sa || ') saf 
 			    on carfg.store = saf.store_code
 				join inventory_smart.plan_master pm on pm.plan_code = carfg.allocation_code
 				where (pm.updated_at AT TIME ZONE ''EST'')::date = ''' || $4 || ''' and pm.status = 3 
				group by 1,2,3,4,5,6,7,8
 			)
 		select 
			paf.store_code, 
			paf.store_name,
			sum(unit_allocated) as total_unit_allocated,
			sum(it) as it,
			sum(oh) as oh,
			sum(oo) as oo,
			SUM(wos_allocation) AS wos_units_allocation,
            SUM(min_allocation) AS min_units_allocation
		 from product_master_filters_data paf
		 group by 1,2';
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