--liquibase formatted sql
--changeset liquibase:reporting_allocation_deep_dive_aggregated runOnChange:true stripComments:false splitStatements:false context:Release_1_0_1 labels:MTP-87330
--comment: MTP-87330
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_allocation_deep_dive_aggregated(input refcursor, jsonb, jsonb, date, date);
CREATE OR REPLACE FUNCTION inventory_smart.reporting_allocation_deep_dive_aggregated(input refcursor, jsonb, jsonb, date, date)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
	declare
		_query_pa text := '';
		_query_sa text := '';
		_query_table_filters text := '';
		_query_combine text := '';
		_cache_payload jsonb := jsonb_build_object('product_attributes', $2, 'store_attributes', $3, 'allocation_start_date', $4,'allocation_end_date', $5);
		_cache_table_id text;
		_cache_schema text := 'inventory_smart';
		_cache_sp text := '.reporting_allocation_deep_dive_aggregated';
		_cache_key_pattern text := '{schema_name}:{sp_name}:{request}';
		_cache_dependencies text[] := '{inventory_smart.create_allocation_result_flat_gurobi, inventory_smart.plan_master, global.transaction_master}';
		_client_columns text;
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
			WITH allocation_unit_sales AS (
				    SELECT 
				    	coalesce(sum(carfg.allocated_total),0) as allocated_total,
						coalesce(count(distinct carfg.allocation_code),0)  as total_allocation_code 
					FROM (select * FROM global.product_attributes_filter  ' || _query_pa || ') paf
				    join global.product_mapping_product_store pmps
				    using(product_code)
				    join (select channel, store_code FROM global.store_attributes_filter ' || _query_sa || ') saf 
				    using(store_code)
					join inventory_smart.create_allocation_result_flat_gurobi carfg on carfg.article  = paf.article 
					--and carfg.retail_size_cd = paf.size 
					and carfg.store = saf.store_code
					join inventory_smart.plan_master pm on pm.plan_code = carfg.allocation_code
					where ((pm.updated_at AT TIME ZONE ''UTC'')::date between ''' || $4 || ''' and '''|| $5 || ''')  and pm.status = 3
				)
				--			select * from product_master_filters_data
				 select * from allocation_unit_sales';
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
