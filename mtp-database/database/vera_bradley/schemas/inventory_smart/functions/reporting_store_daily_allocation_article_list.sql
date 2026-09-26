--liquibase formatted sql
--changeset liquibase:reporting_store_daily_allocation_article_list runOnChange:true stripComments:false splitStatements:false context:Release_1_1_0 labels:MTP-37199
--comment: MTP-37199
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
		_channel text := '';
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
		_channel := inventory_smart.get_channel_from_input($3);
		_query_combine := '
			WITH product_master_filters_data AS (
				    SELECT 
				    	paf.l0_name,
				    	paf.l1_name,
				    	paf.l2_name,

						paf.l3_name,
						paf.launch_date,
					    paf.selling_collection,
					    paf.fabrication,
						TO_CHAR(paf.clearance_start_date, ''YYYY-MM-DD'') as clearance_start_date,
						TO_CHAR(paf.clearance_end_date, ''YYYY-MM-DD'') as clearance_end_date,
						TO_CHAR(paf.retirement_date, ''YYYY-MM-DD'') as retirement_date,
					    paf.size,
						TO_CHAR(paf.selldown_date, ''YYYY-MM-DD'') as selldown_date,
				--		paf.color,
				--		paf.color_code,

				    	--pmps.product_code,
						retail_size_cd,
						store_code,
						carfg.article,
						carfg.allocation_code,
						pm."name" as plan_name,
						channel
						' || _client_columns || ',
						coalesce(max(sdru.quantity), 0) as reserve_quantity,
						coalesce(max(carfg.allocated_total),0) as unit_allocated,  -- sum(units_allocated*COALESCE(units_in_pack, 1)) units_allocated,
						coalesce(max(carfg.inv_avai),0) as inv_avai -- sum(dc_available*COALESCE(units_in_pack, 1)) dc_available
					FROM (select * FROM global.product_attributes_filter  ' || _query_pa || ') paf
				    join global.product_mapping_product_store pmps
				    using(product_code)
				    join (select channel, store_code FROM global.store_attributes_filter ' || _query_sa || ') saf 
				    using(store_code)
					join inventory_smart.create_allocation_result_flat_gurobi carfg on carfg.article  = paf.article
					and carfg.retail_size_cd = paf.size
					and carfg.store = saf.store_code
					left join inventory_smart.sku_dc_reserved_units sdru using (product_code, channel)
					join inventory_smart.plan_master pm on pm.plan_code = carfg.allocation_code
					where (pm.updated_at AT TIME ZONE ''EST'')::date = ''' || $4 || ''' and pm.status = 3
					group by 1,2,3,4,5,6,7,8,9 ,10,11,12,13,14,15,16,17,18,19 ' || _client_columns || '
				)
				--			select * from product_master_filters_data
				,
				total_inventory_level1 as (
					select 
						article,
						retail_size_cd,
						allocation_code,
						l0_name,
						l1_name,
						l2_name,
						channel,

						l3_name,
						launch_date,
					    selling_collection,
					    fabrication,
					    clearance_start_date,
					    clearance_end_date,
					    retirement_date,
					    size,
					    selldown_date,
					--	paf.color,
					--	color_code,

						plan_name
						' || _client_columns || ',
						sum(unit_allocated) as unit_allocated,
						max(reserve_quantity) as reserve_quantity,
						max(inv_avai) as inv_avai
					from
						product_master_filters_data paf
					group by 1, 2,3,4,5,6,7,8 ,9,10,11,12,13,14,15,16,17 ' || _client_columns || '
				)
				,
				final_result as (
					select 
						paf.article,
						allocation_code,
						l0_name,
						l1_name,
						l2_name,
						channel,
	
					--	dpc.parent_article,
					--	dpc.pack_description,
						article_status_tag,
						
						l3_name,
						launch_date,
					    selling_collection,
					    fabrication,
					    clearance_start_date,
					    clearance_end_date,
					    retirement_date,
					    paf.size,
					    selldown_date,
					--	paf.color,
					--	color_code,

						plan_name
						' || _client_columns || ',
						sum(unit_allocated) as unit_allocated,
						sum(inv_avai) as inv_avai,
						sum(reserve_quantity) as reserve_quantity
					from
						total_inventory_level1 paf
					--	left join inventory_smart.dc_pack_configuration  dpc on dpc.article = paf.article
						left join (select article, article_status_tag 
							from inventory_smart.ph_master where channel = '''||_channel||''') ph on ph.article = paf.article
					group by 1, 2,3,4,5,6,7  ,8,9,10, 11,12,13,14,15,16,17 ' || _client_columns || '
				)
				select *, (inv_avai-(unit_allocated+reserve_quantity)) as dc_available, concat(article, ''-'', plan_name, ''-'', size) as key  from final_result';
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