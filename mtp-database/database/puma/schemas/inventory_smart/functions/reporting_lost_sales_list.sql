--liquibase formatted sql
--changeset liquibase:reporting_lost_sales_list runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-21455
--comment: paginated lost sales
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_lost_sales_list(input refcursor, jsonb, jsonb, integer, integer, text);
CREATE OR REPLACE FUNCTION inventory_smart.reporting_lost_sales_list(input refcursor, jsonb, jsonb, integer, integer, text, jsonb)
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
  		_cache_sp text := '.reporting_lost_sales_list';
  		_cache_key_pattern text := '{schema_name}:{sp_name}:{request}';
  		_cache_dependencies text[] := '{inventory_smart.loss_units}';
  		_client_columns text;
  		_table_query text = '';
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
  		_table_query = global.form_table_query($7);
  		_query_combine := '
  			WITH product_master_filters_data AS (
  			    SELECT 
  					saf.store_code,
 					store_id,
 					store_name,
 					product_description,
 					color,
 					size_bucket,
 					style,
 					article,
 					fiscal_week,
 					fiscal_year
  					' || _client_columns || ',
 					max(opening_inventory) as opening_inventory,
 					max(quantity) as quantity,
 					max(cluster_avg_sales) as cluster_avg_sales,
 					max(lost_units) as lost_units,
 					max(line_amount) as line_amount,
 					max(lost_sales) as lost_sales
  				FROM (select * FROM global.product_attributes_filter ' || _query_pa || ') paf
  			    join inventory_smart.loss_units lu on lu.product_hierarchy = paf.article
  			    join (select store_code,store_name,store_id FROM global.store_attributes_filter ' || _query_sa || ') saf 
  			    on saf.store_code = lu.store_code 
 				group by 1,2,3,4,5,6,7,8,9,10 ' || _client_columns || '
  			)
  --			select * from product_master_filters_data
  			,
  			loss_units AS (
  				select
 					store_code,
 					store_id,
 					store_name,
 					product_description,
 					color,
 					size_bucket,
 					style,
 					article,
 					fiscal_week,
 					fiscal_year
  					' || _client_columns || ',
 					ROUND(coalesce(sum(opening_inventory),0)::numeric,2) as week_open_balance,
 					coalesce(sum(quantity),0) as total_quantity,
 					ROUND(coalesce(avg(cluster_avg_sales),0)::numeric,2) as cluster_avg_sales,
 					coalesce(sum(lost_units),0) as lost_units,
 					ROUND(coalesce(sum(line_amount),0)::numeric,2) as line_amount,
 					ROUND(coalesce(sum(lost_sales),0)::numeric,2) as lost_sales
  				from product_master_filters_data lu
 				where fiscal_week = ' || _fiscal_week || ' and fiscal_year = ' || _fiscal_year || '
 				group by 1,2,3,4,5,6,7,8,9,10 ' || _client_columns || '
  			)
  			--select * from loss_units
  			select *, concat(article, ''_'', store_code) as key from loss_units';
  		raise notice '%', _query_combine;
  		select
  		  * 
  		from 
  		  cache.wrap_sp(
  			_cache_schema, _cache_sp, _cache_payload, 
  			_query_combine, _cache_dependencies, 
  			_cache_key_pattern
  		  ) into _cache_table_id;
  		perform set_config(
  		  'myvars.cache_table_id', _cache_table_id, 
  		  true
  		);
  		open $1 for execute 'select * from "cache"."' || _cache_table_id || '" X ' || _query_table_filters;
  		RETURN $1;
  	end
  $function$
;