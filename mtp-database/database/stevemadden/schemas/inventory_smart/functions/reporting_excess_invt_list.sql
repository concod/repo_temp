--liquibase formatted sql
--changeset shreyas.sankpal@impactanalytics.co:reporting_excess_invt_list_MTP-57206 runOnChange:true stripComments:false splitStatements:false context: MTP-71177 labels: MTP-71177
--comment: MTP-71177 added style name
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_excess_invt_list(input refcursor, jsonb, jsonb, integer, integer, text, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.reporting_excess_invt_list(input refcursor, jsonb, jsonb, integer, integer, text, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 	declare
 		_query_pa text := '';
 		_query_sa text := '';
 		_channel text := inventory_smart.get_channel_from_input($3);
 		_fiscal_week text := $4;
 		_fiscal_year text := $5;
 		_query_table_filters text := '';
 		_query_combine text := '';
 		_cache_payload jsonb := jsonb_build_object('product_attributes', $2, 'store_attributes', $3, 'fiscal_week', $4, 'fiscal_year', $5, 'client_columns', $6);
 		_cache_table_id text;
 		_cache_schema text := 'inventory_smart';
 		_cache_sp text := '.reporting_excess_invt_list';
 		_cache_key_pattern text := '{schema_name}:{sp_name}:{request}';
 		_cache_dependencies text[] := '{inventory_smart.excess_units}';
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
		_query_table_filters := global.form_table_query($7);
 		_query_combine := '
 			with excess_units AS (
 				select
 					product_code,
 					article,
 					"size",
 					eu.store_code,
					saf.store_name,
					l0_name,
					l1_name,
					l2_name,
					l3_name,
					l4_name,
					style_name,
					channel,
 					fiscal_year,
 					fiscal_week,
 					oh,
 					oo,
 					it,
 					week_qty,
 					eu.ros,
 					target_wos,
 					wos_pred,
 					excess_inv,
 					excess_inv_cost
 					' || _client_columns || '
 				from (select * from inventory_smart.excess_units eu where fiscal_week = ' || _fiscal_week || ' and fiscal_year = ' || _fiscal_year || ' ) eu
				join (select distinct product_code, article, "size", l0_name, l1_name, l2_name, l3_name, l4_name, style_name FROM global.product_attributes_filter ' || _query_pa || ') paf on paf.product_code = eu.product_hierarchy
 				join (select store_code, store_name, channel FROM global.store_attributes_filter ' || _query_sa || ') saf 
 			    using(store_code)
 			),
 			final_result AS (
 				select
 					product_code,
 					article,
 					"size",
 					store_code,
					store_name,
					l0_name,
					l1_name,
					l2_name,
					l3_name,
					l4_name,
					style_name,
					channel,
 					fiscal_year,
 					fiscal_week
 					' || _client_columns || ',
 					sum(oh) as total_oh,
 					sum(oo) as total_oo,
 					sum(it) as total_it,
 					sum(week_qty) as total_week_qty,
 					round(sum(ros::numeric),2) as total_ros,
 					round(sum(target_wos::numeric),2) as total_target_wos,
 					round(sum(wos_pred::numeric),2) as total_wos_pred,
 					round(sum(excess_inv::numeric),2) as total_execss_inv,
 					round(sum(excess_inv_cost::numeric),2) as total_excess_inv_cost
 				from excess_units eu
 				--where fiscal_week = ' || _fiscal_week || ' and fiscal_year = ' || _fiscal_year || '
 				group by product_code, store_code, store_name, l0_name, l1_name, l2_name, l3_name, l4_name, style_name, channel, fiscal_year, fiscal_week, article, "size" ' || _client_columns || '
 			)
 			select *, concat(article, ''_'', store_code) as key from final_result';
 		raise notice '%', _query_combine;
 		select
 		  * 
 		from 
 		  cache.wrap_sp(
 			_cache_schema, _cache_sp, _cache_payload, 
 			_query_combine, _cache_dependencies, 
 			_cache_key_pattern
 		  ) into _cache_table_id;
 		_query_table_filters := global.form_table_query($7);
 		perform set_config(
 		  'myvars.cache_table_id', _cache_table_id, 
 		  true
 		);
 		open $1 for execute 'select * from "cache"."' || _cache_table_id || '" X ' || _query_table_filters;
 --		open $1 for execute 'select * from inventory_smart.raise_notice order by t desc';
 		RETURN $1;
 	end
 $function$
;