--liquibase formatted sql
--changeset liquibase:reporting_store_stock_drill_down_store_code_level runOnChange:true stripComments:false splitStatements:false context:MTP-40560 labels:MTP-40560
--comment: MTP-40560 Fix key for lw_receipt_cost | MTP-63259
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_store_stock_drill_down_store_code_level(refcursor, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.reporting_store_stock_drill_down_store_code_level(input refcursor, jsonb, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/*
  * Function/Procedure name: inventory_smart.reporting_store_stock_drill_down_store_code_level
  * No of input parameter: 4
  * Parameter Description : 
  * 						   $1 = Refcursor name 	
  * 						   $2 = Product Filters
  *                         $3 = Store Filters
  * 						   $4 = Meta Filters
  * 
*/
	declare 
		_query_pa text := '';
	 	_query_sa text := '';
	 	_query_pa_sa text := '';
	 	_query_table_filters text := '';
	 	_query_table_sort text :='';
	 	_query_combine text := '';			
	 	_cache_payload jsonb := jsonb_build_object('product_attributes', $2, 'store_attributes', $3);
		_cache_table_id text;
		_cache_schema text := 'inventory_smart';
		_cache_sp text := '.reporting_store_stock_drill_down_store_code_level';
		_cache_key_pattern text := '{schema_name}:{sp_name}:{request}';
		_cache_dependencies text[] := '{inventory_smart.store_stock_drilldown_store_code_level,
										global.store_attributes_filter}';
	begin
		_query_pa := global.form_main_table_filters('product_attributes_filter', $2);
		_query_sa := global.form_main_table_filters('store_attributes_filter', $3);
		if LENGTH(_query_sa) > 0 and LENGTH(_query_pa) >0 then
			_query_sa:= ' AND ' || SUBSTRING(_query_sa, 8);
		end if;
		_query_pa_sa := _query_pa || _query_sa;
		_query_table_filters := global.form_table_query($4);
		_query_combine := '
			with saf as (
			select 
				store_code,
				store_name,
				store_attribute,
				channel,
				state, 
				district,	
				region
			from
				"global".store_attributes_filter saf 
		),
		
		ssd_data as (
		  select 
		    ssdscl.product_code,  
		    ssdscl.product_description,
		    ssdscl.store_code,
		    ssdscl.store_name,
		    ssdscl.primary_sku,
		    ssdscl.l0_name,
		    ssdscl.l1_name,
		    ssdscl.l3_name,
		    ssdscl.l4_name,
		    ssdscl.psa_name,
			saf.state,
			saf.district,
			saf.region,
			ssdscl.store_attribute,
			ssdscl.sku_status,
			ssdscl.store_status,
			ssdscl.store_group_description,
		    sum(coalesce(target_st_percentage, 0)) as target_st_percentage, 
		    sum(coalesce(st_percentage, 0)) as st_percentage, 
		    sum(coalesce(std_receipt_units, 0)) as std_receipt_units, 
		    sum(coalesce(std_receipt_cost, 0)) as std_receipt_cost, 
		    sum(coalesce(std_sales_cost, 0)) as std_sales_cost,
		    sum(coalesce(std_sales_units, 0)) as std_sales_units,
		    sum(coalesce(lw_st_percentage, 0)) as lw_st_percentage,
		    sum(coalesce(lw_receipt_units, 0)) as lw_receipt_units,
		    sum(coalesce(lw_receipt_cost, 0)) as lw_receipt_cost,
		    sum(coalesce(lw_sales_cost, 0)) as lw_sales_cost,
		    sum(coalesce(lw_sales_units, 0)) as lw_sales_units,
		    sum(coalesce(lw_revenue, 0)) as lw_revenue,
		    sum(coalesce(wos, 0)) as wos,
		    sum(coalesce(oh, 0)) as oh,
		    sum(coalesce(it, 0)) as it,
		    sum(coalesce(oo, 0)) as oo,
		    sum(coalesce(total_inv, 0)) as total_inv,
		    sum(coalesce(dc_oh, 0)) as dc_oh,
		    sum(coalesce(dc_it, 0)) as dc_it,
		    sum(coalesce(dc_oo, 0)) as dc_oo,
		    sum(coalesce(total_inv_dc, 0)) as total_inv_dc
		  from 
		    inventory_smart.store_stock_drilldown_store_code_level ssdscl
		    left join saf using(store_code)
			'|| _query_pa_sa ||'
		  group by 
		    1, 
		    2, 
		    3, 
		    4, 
		    5, 
		    6,
		    7,
		    8,
		    9,
		    10,
		    11,
			12,
			13,
			14,
			15,
			16,
			17
			order by primary_sku
		),
		
		final_result as (
		  select 
		    ssd.*
		  from 
		    ssd_data ssd 
		) 
		
		select * from final_result';
	
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
	end
$function$
;