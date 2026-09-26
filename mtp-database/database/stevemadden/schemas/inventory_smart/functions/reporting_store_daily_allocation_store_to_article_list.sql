--liquibase formatted sql
--changeset liquibase:reporting_store_daily_allocation_store_to_article_list_MTP-57254 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: created reporting_store_daily_allocation_store_to_article_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_store_daily_allocation_store_to_article_list(refcursor, jsonb, jsonb, date, text, text);
CREATE OR REPLACE FUNCTION inventory_smart.reporting_store_daily_allocation_store_to_article_list(input refcursor, jsonb, jsonb, date, text, text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 	declare
 		_query_pa text := '';
 		_query_sa text := '';
 		_allocation_date text := $4;
 		_query_table_filters text := '';
 		_query_combine text := '';
 		_cache_payload jsonb := jsonb_build_object('product_attributes', $2, 'store_attributes', $3, 'allocation_date', $4, 'store_code', $5, 'client_columns', $6);
 		_cache_table_id text;
 		_cache_schema text := 'inventory_smart';
 		_cache_sp text := '.reporting_store_daily_allocation_store_to_article_list';
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
 		if length ($6)> 0 then
 			_client_columns := ','||$6;
 		else 
 			_client_columns := '';
 		end if;
 		_query_combine := '
 			WITH product_master_filters_data AS (
			    SELECT 
			    	paf.l0_name,
			    	paf.l1_name,
--			    	paf.l2_name,
					paf.product_code,
					paf.size,
					store_code,
					carfg.article,
					carfg.retail_size_cd,
					carfg.allocation_code,
					carfg.allocated_total,
					carfg.min,
					carfg.updated_oh_oo_it,
					pm."name" as plan_name,
					channel
					' || _client_columns || '
					,coalesce(max(inv_avai), 0) as inv_avai
					,coalesce(max(sdru.quantity), 0) as reserve_quantity
					,coalesce(max(allocated_total), 0) as unit_allocated -- sum(units_allocated*COALESCE(units_in_pack, 1)) units_allocated,
					,greatest(0,allocated_total - greatest(0,MIN - (updated_oh_oo_it))) AS wos_allocation
                	,least(allocated_total,greatest(0,MIN - (updated_oh_oo_it)))        AS min_allocation
				FROM (select * FROM global.product_attributes_filter  ' || _query_pa || ') paf
				join inventory_smart.create_allocation_result_flat_gurobi carfg on carfg.article  = paf.article and carfg.retail_size_cd = paf.size
				join (select channel, store_code FROM global.store_attributes_filter ' || _query_sa || ') saf 
			    on carfg.store = saf.store_code
				join inventory_smart.plan_master pm on pm.plan_code = carfg.allocation_code
				left join inventory_smart.sku_dc_reserved_units sdru using (product_code, channel)
				where pm.status=3 and (pm.updated_at AT TIME ZONE ''EST'')::date = ''' || $4 || '''
				group by 1,2,3,4,5,6,7,8,9,10,11,12,13 ' || _client_columns || '
			)
			--			select * from product_master_filters_data
			,
			store_article_level_unit_allocated as (
				select 
					article,
					allocation_code,
					l0_name,
					l1_name,
--					l2_name,
					product_code,
					size,
					channel,
					plan_name
					' || _client_columns || ',
					sum(unit_allocated) as store_level_unit_allocated
				from
					product_master_filters_data paf
				where store_code = ''' || $5 || '''
				group by 1,2,3,4,5,6,7,8 ' || _client_columns || '
				)
--				select * from store_article_level_unit_allocated
				,
				total_inventory_level1 as (
					select 
						article,
						retail_size_cd,
						allocation_code,
						plan_name,
						sum(unit_allocated) as unit_allocated,
						sum(reserve_quantity) as reserve_quantity,
						max(inv_avai) as inv_avai,
						SUM(wos_allocation) AS wos_allocation,
                    	SUM(min_allocation) AS min_allocation
					from
						product_master_filters_data
					group by 1,2,3,4
				)
				,
				article_level_total_inventory_level1 as (
					select 
						article,
						allocation_code,
						sum(unit_allocated) as unit_allocated,
						sum(reserve_quantity) as reserve_quantity,
						sum(inv_avai) as inv_avai,
						SUM(wos_allocation) AS wos_allocation,
                    	SUM(min_allocation) AS min_allocation
					from 
						total_inventory_level1
					group by 1,2
				),
				article_level_total_inventory_level2 as (
					select 
						article,
						sum(unit_allocated) as unit_allocated,
						sum(reserve_quantity) as reserve_quantity,
						max(inv_avai) as inv_avai,
						SUM(wos_allocation) AS wos_allocation,
                    	SUM(min_allocation) AS min_allocation
					from 
						article_level_total_inventory_level1
					group by 1
				)
		--		select * from article_level_total_inventory_level2
	 			,
	 			final_result AS (
	 				select
	 					paf.article,
						paf.allocation_code,
						paf.l0_name,
						paf.l1_name,
--						paf.l2_name,
						paf.product_code,
						paf.size,
						paf.channel,
						paf.plan_name
	 					' || _client_columns || ',
 					sum(til1.unit_allocated) as total_unit_allocated,
					max(paf.store_level_unit_allocated) as unit_allocated,
					COALESCE(SUM(til1.min_allocation),0) AS min_units_allocation,
                	COALESCE(SUM(til1.wos_allocation),0) AS wos_units_allocation,
					sum(til1.inv_avai) as inv_avai,
					sum(til1.reserve_quantity) as reserve_quantity,
					max(alti2.unit_allocated) as article_level_total_unit_allocated,
					max(alti2.reserve_quantity) as article_level_total_reserve_quantity,
					max(alti2.inv_avai) as article_level_total_inv_avai
 				from
					store_article_level_unit_allocated paf
					left join total_inventory_level1 til1 on til1.article = paf.article 
					and til1.allocation_code = paf.allocation_code
					left join article_level_total_inventory_level2 alti2 on alti2.article = paf.article
				group by 1, 2,3,4,5,6,7,8 ' || _client_columns || '
 			)
			select *,(article_level_total_inv_avai-(article_level_total_unit_allocated+article_level_total_reserve_quantity)) as dc_available, concat(article, ''-'', plan_name) as key from final_result order by unit_allocated desc';
			-- 			select *,(inv_avai-(total_unit_allocated+reserve_quantity)) as dc_available, concat(article, ''-'', plan_name) as key from final_result order by unit_allocated desc';
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