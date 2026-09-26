--liquibase formatted sql
--changeset liquibase:reporting_store_daily_allocation_article_to_store_list runOnChange:true stripComments:false splitStatements:false context:MTP-21951 labels:MTP-21951
--comment: MTP-21951-ordering-sized-columns
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_store_daily_allocation_article_to_store_list(input refcursor, jsonb, jsonb, date);
CREATE OR REPLACE FUNCTION inventory_smart.reporting_store_daily_allocation_article_to_store_list(input refcursor, jsonb, jsonb, date)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 #variable_conflict use_column
 declare
 _query_pa text := '';
 _query_sa text := '';
 _allocation_date text := $4;
 _article text := '';
 _query_table_filters text := '';
 _query_combine text := '';
 _cache_payload jsonb := jsonb_build_object('product_attributes', $2, 'store_attributes', $3, 'allocation_date', $4);
 _cache_table_id text;
 _cache_schema text := 'inventory_smart';
 _cache_sp text := '.reporting_store_daily_allocation_article_to_store_list';
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
 	raise notice '%ttttt',_query_pa;
 	
 	_query_combine := '
 		WITH product_master_filters_data AS (
 			    SELECT 
 			  	saf.store_code,
 					saf.store_name,
					saf.district,
					saf.state,
					saf.climate,
					asg.grade as store_grade,
 					carfg.allocation_code,
 					carfg.article,
 					carfg.retail_size_cd as size,
 					pm."name" as plan_name,
					ast.order as order_num,
 					max(carfg.allocated_total) as unit_allocated,  -- sum(units_allocated*COALESCE(units_in_pack, 1)) units_allocated,
 					max(carfg.inv_avai) as inv_avai -- sum(dc_available*COALESCE(units_in_pack, 1)) dc_available
 				FROM (select * FROM global.product_attributes_filter  ' || _query_pa || ') paf
 			    join global.product_mapping_product_store pmps
 			    using(product_code)
 			    join (select channel, store_code, store_name, district, state, climate FROM global.store_attributes_filter ' || _query_sa || ') saf 
 			    using(store_code)
 				join inventory_smart.create_allocation_result_flat_gurobi carfg on carfg.article  = paf.article
 				--and carfg.retail_size_cd = paf.size
 				and carfg.store = saf.store_code
 				join inventory_smart.plan_master pm on pm.plan_code = carfg.allocation_code
				left join inventory_smart.article_store_grade asg on asg.store_code = saf.store_code and paf.article  = asg.article
				join inventory_smart.article_status_tag ast on paf.product_code = ast.product_code and saf.channel = ast.channel and carfg.retail_size_cd = ast.size
 				where pm.status=3 and (pm.updated_at AT TIME ZONE ''EST'')::date = ''' || $4 || '''
				group by 1,2,3,4,5,6,7,8,9,10,11
 			)
 			--			select * from product_master_filters_data
		select *, concat(store_code, ''-'', plan_name) as key from product_master_filters_data order by order_num';
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
