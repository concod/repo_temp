--liquibase formatted sql
--changeset liquibase:new_store_demand_and_constraint runOnChange:true stripComments:false splitStatements:false context:MTP-71177 labels: MTP-71177
--comment: MTP-71177 added style name
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.new_store_demand_and_constraint(input refcursor, jsonb, jsonb, text);
DROP FUNCTION IF EXISTS inventory_smart.new_store_demand_and_constraint(input refcursor, jsonb, jsonb, jsonb, text, text);
DROP FUNCTION IF EXISTS inventory_smart.new_store_demand_and_constraint(input refcursor, jsonb, jsonb, text, text);
CREATE OR REPLACE FUNCTION inventory_smart.new_store_demand_and_constraint(input refcursor, jsonb, jsonb, jsonb, text, text)
 RETURNS refcursor
 LANGUAGE plpgsql
 PARALLEL SAFE
AS $function$
 	declare
 		_query_pa text;
 		_query_sa text;
 		_query_combine text;
 		_query_table_filters text;
 		_client_columns text;
 		_query_l0_name text := '';
		_ph_search text := '';
		_sh_search text := '';
		_overall_search text := '';
		_dummy text := '';
 	begin 	
	 	select $2->>'l0_name' into _query_l0_name;
		if length (_query_l0_name) > 0 then
			_query_l0_name := format('{"l0_name": %1$s}', _query_l0_name);
	    	_query_l0_name := inventory_smart.form_main_table_filters('ph_master', _query_l0_name::jsonb);
	    else
	    	_query_l0_name := '';
	    end if; 		if length ($5)> 0 then
 			_client_columns := ','||$5;
 		else 
 			_client_columns := '';
 		end if;

		
    SELECT * FROM inventory_smart.form_search_sort_clause($4, 'ph_master', 'inventory_smart') INTO _dummy, _ph_search, _overall_search, _dummy, _dummy;
    SELECT * FROM inventory_smart.form_search_sort_clause($4, 'store_attributes_filter', 'global') INTO _dummy, _sh_search, _dummy, _dummy, _dummy;
 		
    _query_table_filters = _overall_search || replace(global.form_table_query($4), 'WHERE', 'AND');
    
		_query_pa := 'SELECT ph_code, channel, l0_name, l1_name, l2_name, l3_name, l4_name, article, unnest(sizes) size, unnest(product_codes) product_code ' || _client_columns || ' FROM inventory_smart.ph_master ph ' || (inventory_smart.form_main_table_filters('ph_master', $2));
 		_query_sa :=  'SELECT store_code, saf.store_name, saf.channel, saf.region  FROM "global".store_attributes_filter saf ' || (global.form_main_table_filters('store_attributes_filter', $3));
 
 		_query_combine := '
 		with product_data as (
 			' || _query_pa || _ph_search || '
 		)
 		, store_data as (
 			' || _query_sa || _sh_search || '
 		)
 		, ph_data as (
 			select 
 			pmps.product_code, 
 		    pmps.mapping_code, 
 		    pmps.store_code,
			pd.ph_code,
 		    l0_name, 
 		    l1_name, 
 		    l2_name,
			l3_name,
			l4_name,
			style_name,
 			size, 
 		    article, 
 		    store_name, 
 		    channel
 			' || _client_columns || '
 			from store_data sd 
 			join (select mapping_code, product_code , store_code, l0_name from global.product_mapping_product_store '||_query_l0_name||') pmps using (store_code) 
			join product_data pd using (product_code, l0_name, channel) 
 		)
 		, constraint_data as (
 			select cm.mapping_code, cm.wos, cm.min_stock, cm.max_stock, cm.ros, cm.aps, cm.safety_stock,
 			null as demand_estimated, null as forecast_estimated, false as is_demand_calculated, psf.*, li.oh
 			from (select l0_name, product_code, store_code, mapping_code, wos, min_stock, max_stock, ros, aps, safety_stock from inventory_smart.constraint_master '||_query_l0_name||') cm
 			join ph_data psf using (product_code, store_code, l0_name)
			join inventory_smart.latest_inventory li using (product_code, store_code)
			WHERE TRUE 
			' || _query_table_filters || '
 		)
 		select * from constraint_data';
 			raise notice '%', _query_combine;
 			open $1 for execute _query_combine;
 			RETURN $1;
 		end
 	$function$
;
