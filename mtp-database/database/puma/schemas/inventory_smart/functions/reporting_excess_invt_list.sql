--liquibase formatted sql
--changeset liquibase:reporting_excess_invt_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0_3 labels:MTP-21159
--comment: bug fix: MTP-21159: removed client_columns concatination in query string as it is not required now
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_excess_invt_list(input refcursor, jsonb, jsonb, integer, integer, text, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.reporting_excess_invt_list(input refcursor, jsonb, jsonb, integer, integer, text, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
	declare
		_query_pa text := '';
		_query_sa text := '';
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
		_query_combine := '
			WITH product_master_filters_data AS (
			    SELECT 
					saf.store_code,
					store_name,
					store_id,
					color,
					product_description,
					style,
					article,
					fiscal_year,
					paf.size_bucket,
					fiscal_week,
					cm.min_stock as min_stock,
					max(oh) as oh,
					max(oo) as oo,
					max(it) as it,
					max(week_qty) as week_qty,
					max(eu.ros) as ros,
					max(target_wos) as target_wos,
					max(wos_pred) as wos_pred,
					max(excess_inv) as excess_inv,
					max(excess_inv_cost) as excess_inv_cost,
					max(tot_inv) as tot_inv
				FROM (select * FROM global.product_attributes_filter ' || _query_pa || ') paf
			    join inventory_smart.excess_units eu on eu.product_hierarchy  = paf.article
				join (select store_code,store_name, store_id FROM global.store_attributes_filter ' || _query_sa || ') saf 
			    on saf.store_code = eu.store_code
				join inventory_smart.constraint_master cm on (cm.product_code = paf.product_code and cm.store_code = saf.store_code)
				group by 1,2,3,4,5,6,7,8,9,10,11
			)
--			select * from product_master_filters_data
			,
			final_result AS (
				select
					store_code,
					store_name,
					product_description,
					store_id,
					size_bucket,
					color,
					style,
					fiscal_year,
					fiscal_week,
					article,
					sum(min_stock) as min_stock,
					sum(oh) as total_oh,
					sum(oo) as total_oo,
					sum(it) as total_it,
					sum(week_qty) as total_week_qty,
					round(sum(ros::numeric),2) as total_ros,
					round(sum(target_wos::numeric),2) as total_target_wos,
					round(sum(wos_pred::numeric),2) as total_wos_pred,
					round(sum(excess_inv::numeric),2) as total_execss_inv,
					round(sum(excess_inv_cost::numeric),0) as total_excess_inv_cost,
					round(sum(tot_inv::numeric),2) as sum_tot_inv
				from product_master_filters_data eu
				where fiscal_week = ' || _fiscal_week || ' and fiscal_year = ' || _fiscal_year || '
				group by 1,2,3,4,5,6,7,8,9,10
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