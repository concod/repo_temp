--liquibase formatted sql
--changeset liquibase:reporting_lost_sales_data runOnChange:true stripComments:false splitStatements:false context:MTP-40664 labels:MTP-40664
--comment: MTP-40664 Add SP for Lost Sales table
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_lost_sales_data(refcursor, jsonb, jsonb, jsonb, text);
CREATE OR REPLACE FUNCTION inventory_smart.reporting_lost_sales_data(input refcursor, jsonb, jsonb, jsonb, text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/*
  * Function/Procedure name: inventory_smart.reporting_lost_sales_data
  * No of input parameter: 5
  * Parameter Description : 
  * 						   $1 = Refcursor name 	
  * 						   $2 = Product Filters
  *                         $3 = Store Filters
  * 						   $4 = Meta Filters
  * 						%5 = fiscal_year_week
  * 
*/
	declare 
		_query_pa text := '';
	 	_query_sa text := '';
	 	_query_pa_sa text := '';
	 	_query_table_filters text := '';
	 	_query_table_sort text :='';
	 	_query_combine text := '';
	 	_fiscal_year_week text := '';
	 	_cache_payload jsonb := jsonb_build_object('product_attributes', $2, 'store_attributes', $3, 'fiscal_year_week', $5);
		_cache_table_id text;
		_cache_schema text := 'inventory_smart';
		_cache_sp text := '.reporting_lost_sales_data';
		_cache_key_pattern text := '{schema_name}:{sp_name}:{request}';
		_cache_dependencies text[] := '{inventory_smart.lost_sales}';
	 begin
		_query_pa := global.form_main_table_filters('product_attributes_filter', $2);
		_query_sa := global.form_main_table_filters('store_attributes_filter', $3);
		if LENGTH(_query_sa) > 0 and LENGTH(_query_pa) >0 then
			_query_sa:= ' AND ' || SUBSTRING(_query_sa, 8);
		end if;
		_query_pa_sa := _query_pa || _query_sa;
		_query_table_filters := global.form_table_query($4);
		_fiscal_year_week := $5;
		if LENGTH(_query_pa_sa) = 0 then
			_query_pa_sa := 'WHERE TRUE';
		end if;
	
		_query_combine := '			
			with lost_sales_data as (
				select 
				SUBSTRING(ls.fiscal_year_week::varchar(255), 1, 4) as fiscal_year,
				SUBSTRING(ls.fiscal_year_week::varchar(255), 5, 2) as fiscal_week,
				ls.psa_name,
				ls.product_code,
				ls.product_description,
				ls.primary_sku,
				ls.l0_name,
				ls.l1_name,
				ls.l3_name,
				ls.l4_name,
				coalesce(sum(ls.opening_inventory), 0) as opening_inventory,
				coalesce(sum(ls.units), 0) as units,
				coalesce(sum(ls.lost_units), 0) as lost_units,
				coalesce(sum(ls.lost_sales), 0) as lost_sales,
				coalesce(sum(ls.cluster_avg_sales), 0) as cluster_avg_sales
				from 
				inventory_smart.lost_sales ls
				' || _query_pa_sa || '
				AND fiscal_year_week = ' || _fiscal_year_week || '
				group by
				1,2,3,4,5,6,7,8,9,10
				order by primary_sku
			),
			
			final_result as (
				select ls.*
				from
				lost_sales_data ls
			)
	
			select * from final_result ';
		raise notice '%',_query_combine; 	
--		open $1 for execute _query_combine; 	
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
	END;
$function$
;