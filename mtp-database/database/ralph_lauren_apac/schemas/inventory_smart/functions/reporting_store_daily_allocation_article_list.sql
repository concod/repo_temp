--liquibase formatted sql
--changeset liquibase:reporting_store_daily_allocation_article_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0_1 labels:MTP-34240.,MTP-95045
--comment:  MTP-34240 Brand column added.,MTP-95045
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_store_daily_allocation_article_list(input refcursor, jsonb, jsonb, date, text);
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
				    	paf.l2_name,
				    	--pmps.product_code,
						paf.product_description,
						paf.color,
						paf.brand,
						retail_size_cd,
						carfg.store as store_code,
						carfg.article,
						carfg.allocation_code,
						pm."name" as plan_name,
						channel,
						carfg.dc_codes
						' || _client_columns || ',
						coalesce(max(sdru.quantity), 0) as reserve_quantity,
						coalesce(max(carfg.allocated_total),0) as unit_allocated,  -- sum(units_allocated*COALESCE(units_in_pack, 1)) units_allocated,
						coalesce(max(carfg.inv_avai),0) as inv_avai -- sum(dc_available*COALESCE(units_in_pack, 1)) dc_available
					FROM (select * FROM global.product_attributes_filter  ' || _query_pa || ') paf
				    --join global.product_mapping_product_store pmps
				    --using(product_code)
					join inventory_smart.create_allocation_result_flat_gurobi carfg on carfg.article  = paf.article
					and carfg.retail_size_cd = paf.size
					--and carfg.store = saf.store_code
					join (select channel, store_code FROM global.store_attributes_filter ' || _query_sa || ') saf 
				    on carfg.store = saf.store_code
					left join inventory_smart.sku_dc_reserved_units sdru using (product_code, channel)
					join inventory_smart.plan_master pm on pm.plan_code = carfg.allocation_code
					where (pm.updated_at AT TIME ZONE '''|| inventory_smart.get_tenant_timezone() ||''')::date = ''' || $4 || ''' and pm.status = 3
					group by 1,2,3,4,5,6,7,8,9,10,11,12,13 ' || _client_columns || '
				)
				--			select * from product_master_filters_data
				,
				total_inventory_level1 as (
					select 
						article,
						retail_size_cd,
						allocation_code,
						product_description, 
						color,
						l0_name,
						l1_name,
						l2_name,
						channel,
						plan_name,
						brand,
						dc_codes
						' || _client_columns || ',
						sum(unit_allocated) as unit_allocated,
						max(reserve_quantity) as reserve_quantity,
						max(inv_avai) as inv_avai
					from
						product_master_filters_data paf
					group by 1, 2,3,4,5,6,7,8,9,10,11,12 ' || _client_columns || '
				)
				,
				final_result as (
					select 
						article,
						allocation_code,
						product_description, 
						color,
						l0_name,
						l1_name,
						l2_name,
						channel,
						brand,
						plan_name
						' || _client_columns || ',
						sum(unit_allocated) as unit_allocated,
						sum(inv_avai) as inv_avai,
						sum(reserve_quantity) as reserve_quantity
					from
						total_inventory_level1 paf
					group by 1, 2,3,4,5,6,7,8,9,10 ' || _client_columns || '
				)
				select *, (inv_avai-(unit_allocated+reserve_quantity)) as dc_available, concat(article, ''-'', plan_name) as key  from final_result';
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
