--liquibase formatted sql
--changeset liquibase:reporting_store_stock_drill_down_store_aggregate_level runOnChange:true stripComments:false splitStatements:false context:MTP-40560 labels:MTP-40560
--comment: MTP-40560 Fix key for lw_receipt_cost | MTP-63259
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_store_stock_drill_down_store_aggregate_level(refcursor, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.reporting_store_stock_drill_down_store_aggregate_level(input refcursor, jsonb, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/*
  * Function/Procedure name: inventory_smart.reporting_store_stock_drill_down_store_aggregate_level
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
		_cache_sp text := '.reporting_store_stock_drill_down_store_aggregate_level';
		_cache_key_pattern text := '{schema_name}:{sp_name}:{request}';
		_cache_dependencies text[] := '{inventory_smart.store_stock_drilldown_store_band_level}';
			
	begin
		_query_pa := global.form_main_table_filters('product_attributes_filter', $2);
		_query_sa := global.form_main_table_filters('store_attributes_filter', $3);
		if LENGTH(_query_sa) > 0 and LENGTH(_query_pa) >0 then
			_query_sa:= ' AND ' || SUBSTRING(_query_sa, 8);
		end if;
		_query_pa_sa := _query_pa || _query_sa;
		_query_table_filters := global.form_table_query($4);
		_query_combine := '
		with ssd_data as (
		  select 
		    ssdsbl.product_code,  
		    ssdsbl.product_description,
		    ssdsbl.primary_sku,
		    ssdsbl.l0_name,
		    ssdsbl.l1_name,
		    ssdsbl.l3_name,
		    ssdsbl.l4_name,
		    ssdsbl.psa_name,
			ssdsbl.sku_status,
			ssdsbl.store_status,
			ssdsbl.l0_code,
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
			inventory_smart.store_stock_drilldown_store_band_level ssdsbl
			' || _query_pa_sa || '
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
			11
			order by primary_sku
		),
		ssd_psaf_merge as (
			select ssd.*,psaf.store_group_description,psaf.store_code from ssd_data ssd 
			left join global.product_store_attributes_filter psaf using(l0_code)
		),
	
		final_result as (
		  select 
		    ssd.*,
			saf.store_attribute
		  from 
		    ssd_psaf_merge ssd 
			left join global.store_attributes_filter saf
			using (store_code)
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