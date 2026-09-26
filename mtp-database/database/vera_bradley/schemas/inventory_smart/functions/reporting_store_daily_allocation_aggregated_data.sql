--liquibase formatted sql
--changeset liquibase:reporting_store_daily_allocation_aggregated_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for reporting_store_daily_allocation_aggregated_data
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_store_daily_allocation_aggregated_data(input refcursor, jsonb, jsonb, date);
CREATE OR REPLACE FUNCTION inventory_smart.reporting_store_daily_allocation_aggregated_data(input refcursor, jsonb, jsonb, date)
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
 _cache_sp text := '.reporting_store_daily_allocation_aggregated_data';
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
 			    	retail_size_cd,
--	    			pmps.product_code,
					store_code,
					carfg.article,
					carfg.allocation_code,
					pm."name" as plan_name,
					channel,
					coalesce(max(inv_avai), 0) as inv_avai,
					coalesce(max(sdru.quantity), 0) as reserve_quantity, -- sum(units_allocated*COALESCE(units_in_pack, 1)) units_allocated,
					coalesce(max(allocated_total), 0) as unit_allocated
 				FROM (select product_code, article, size, l0_name, l1_name, l2_name FROM global.product_attributes_filter  ' || _query_pa || ') paf
 			    join global.product_mapping_product_store pmps
 			    using(product_code)
 			    join (select channel, store_code FROM global.store_attributes_filter ' || _query_sa || ') saf 
 			    using(store_code)
				left join inventory_smart.sku_dc_reserved_units sdru  using (product_code, channel)
 				join inventory_smart.create_allocation_result_flat_gurobi carfg on carfg.article  = paf.article
 				--and carfg.retail_size_cd = paf.size
 				and carfg.store = saf.store_code 
 				join inventory_smart.plan_master pm on pm.plan_code = carfg.allocation_code
 				where (pm.updated_at AT TIME ZONE ''EST'')::date = ''' || $4 || ''' and pm.status = 3
				group by 1,2,3,4,5,6
 			)
 			--			select * from product_master_filters_data
			,
			total_inventory_level1 as (
				select 
					article,
					retail_size_cd,
					allocation_code,
					plan_name,
					sum(unit_allocated) as unit_allocated,
					sum(reserve_quantity) as reserve_quantity,
					max(inv_avai) as inv_avai
				from
					product_master_filters_data
				group by 1, 2,3,4
			)
			--select * from total_inventory_level1
			,
			total_inventory_level2 as (
				select
					article,
					allocation_code,
					coalesce(sum(inv_avai),0) as inv_avai,
					coalesce(sum(unit_allocated),0) as unit_allocated,
					coalesce(sum(reserve_quantity),0) as reserve_quantity
				from total_inventory_level1 til1
				group by 1,2
			)
			--select * from total_inventory_level2
			,
			total_inventory_level3 as (
				select
					article,
					coalesce(max(inv_avai),0) as inv_avai,
					coalesce(sum(unit_allocated),0) as unit_allocated,
					coalesce(sum(reserve_quantity),0) as reserve_quantity
				from 
					total_inventory_level2
				group by 1
			)
			,
	 		final_result as (
	 			select
	 				coalesce(sum(inv_avai),0) as inv_avai,
	 				coalesce(sum(unit_allocated),0) as unit_allocated,
	 				(select count(distinct allocation_code) from total_inventory_level2) as allocation_count,
	 				coalesce(count(distinct article),0) as style_color_count,
					coalesce(sum(reserve_quantity),0) as reserve_quantity
	 			from total_inventory_level3
	 		)
	 		select *, (inv_avai-(unit_allocated+reserve_quantity)) as dc_available from final_result';
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
