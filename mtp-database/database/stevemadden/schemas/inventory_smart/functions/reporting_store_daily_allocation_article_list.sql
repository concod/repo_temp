--liquibase formatted sql
--changeset liquibase:reporting_store_daily_allocation_article_list_MTP-57254 runOnChange:true stripComments:false splitStatements:false context:Release_1_1_0 labels:MTP-57254
--comment: Created reporting_store_daily_allocation_article_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_store_daily_allocation_article_list(refcursor, jsonb, jsonb, date, text);
CREATE OR REPLACE FUNCTION inventory_smart.reporting_store_daily_allocation_article_list(input refcursor, jsonb, jsonb, date, text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
	declare
		_query_pa text := '';
		_query_sa text := '';
		_allocation_date text := $3;
		_query_table_filters text := '';
		_query_combine text := '';
		_cache_payload jsonb := jsonb_build_object('product_attributes', $2, 'store_attributes', $3, 'allocation_date', $4, 'client_columns', $5);
		_cache_table_id text;
		_cache_schema text := 'inventory_smart';
		_cache_sp text := '.reporting_store_daily_allocation_article_list';
		_cache_key_pattern text := '{schema_name}:{sp_name}:{request}';
		_cache_dependencies text[] := '{inventory_smart.create_allocation_result_flat_gurobi, inventory_smart.plan_master}';
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
		if length ($5)> 0 then
			_client_columns := ','||$5;
		else 
			_client_columns := '';
		end if;
		_query_combine := '
			WITH product_master_filters_data AS (
				    SELECT 
				    	paf.l0_name,
				    	paf.l1_name,
				    	pmps.product_code,
						carfg.article,
						paf.size,
						pm."name" as plan_name,
						carfg.allocated_total,
						carfg.min,
						carfg.updated_oh_oo_it
						' || _client_columns || ',
						coalesce(max(sdru.quantity), 0) as reserve_quantity,
						coalesce(max(carfg.allocated_total),0) as unit_allocated,
						greatest(0,allocated_total - greatest(0,MIN - (updated_oh_oo_it))) AS wos_allocation,
                		least(allocated_total,greatest(0,MIN - (updated_oh_oo_it)))        AS min_allocation,
						coalesce(max(carfg.inv_avai),0) as inv_avai
					FROM 
						(select * FROM global.product_attributes_filter  ' || _query_pa || ') paf
				    join 
						global.product_mapping_product_store pmps
				    using(product_code)
					join 
						inventory_smart.create_allocation_result_flat_gurobi carfg 
					on carfg.article  = paf.article
					and carfg.retail_size_cd = paf.size
					--and carfg.store = saf.store_code
					join 
						(select channel, store_code FROM global.store_attributes_filter ' || _query_sa || ') saf 
				    on carfg.store = saf.store_code
					left join 
						inventory_smart.sku_dc_reserved_units sdru 
					using (product_code, channel)
					join 
						inventory_smart.plan_master pm 
					on pm.plan_code = carfg.allocation_code
					where 
						(pm.updated_at AT TIME ZONE ''EST'')::date = ''' || $4 || ''' and pm.status = 3
					group by 1,2,3,4,5,6,7,8,9 ' || _client_columns || '
				)
				--			select * from product_master_filters_data
				,
				total_inventory_level1 as (
					select
						l0_name,
						l1_name,
						product_code,
						article,
						size,
						plan_name
						' || _client_columns || ',
						sum(unit_allocated) as unit_allocated,
						max(reserve_quantity) as reserve_quantity,
						SUM(wos_allocation) AS wos_units_allocation,
                    	SUM(min_allocation) AS min_units_allocation,
						max(inv_avai) as inv_avai
					from
						product_master_filters_data paf
					group by 1, 2,3,4,5,6 ' || _client_columns || '
				)
				,
				final_result as (
					select
						l0_name,
						l1_name,
						product_code,
						article,
						size,
						plan_name
						' || _client_columns || ',
						sum(unit_allocated) as total_unit_allocated,
						COALESCE(SUM(min_units_allocation),0) AS min_units_allocation,
                		COALESCE(SUM(wos_units_allocation),0) AS wos_units_allocation,
						sum(inv_avai) as inv_avai,
						sum(reserve_quantity) as reserve_quantity
					from
						total_inventory_level1 paf
					group by 1, 2,3,4,5,6 ' || _client_columns || '
				)
				select *, (
						inv_avai-(total_unit_allocated+reserve_quantity)) as dc_available, 
						concat(article, ''-'', plan_name
				) as key  from final_result';
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