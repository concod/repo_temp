--liquibase formatted sql
--changeset liquibase:vendor_product_filter_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for vendor_product_filter_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.vendor_product_filter_list(input refcursor, jsonb, jsonb, jsonb, jsonb, jsonb, boolean);
CREATE OR REPLACE FUNCTION global.vendor_product_filter_list(input refcursor, jsonb, jsonb, jsonb, jsonb, jsonb, boolean)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
	declare
	_query_pm text := '';
	_query_vm text := '';
	_query_pa text := '';
	_query_sku_map text := '';
	_query_table_filters text := '';
	_query_combine text := '';
	_final_query text := '';
	/* 	
	 * Function/Procedure name: global.vendor_product_filter_list
	 * calling statement : 	
	  select * from  global.vendor_product_filter_list (
	    '{"vendor_name": [{"operator": "in", "type": "list", "values": ["LUCENT JEWELERS INC"]}]}',
	  	'{"status":[],
	  	  "preferred_status":[]	}',
	  	'{"product_name" :[]}',
	  	'{"l0_name" :[], "l1_name" :[], "l2_name" :[], "l3_name" :[], "style" :[],"color_code" :[]}',
	  	'{}'
	  );
	 * 
	 *
	 * Updated_by       Updated_on      Purpose
	 * ----------       -----------     --------
	 * Akshay Jain		29-Aug-2022		Removed alias from column in select query to match with return name of table
	  Gautam Baruah     15-Sep-2022     Made the function generic by returning refcursor and added condition to return count/records based on $7

	 */
	begin
		_query_vm := 'SELECT * FROM global.vendor_master' || (global.form_main_table_filters('vendor_master', $2));
		raise notice '_query_vm%',_query_vm;
		_query_sku_map := 'SELECT * FROM global.vendor_sku_mapping' || (global.form_main_table_filters('vendor_sku_mapping', $3)); 
		raise notice '_query_sku_map%',_query_sku_map;
		_query_pm := 'SELECT * FROM global.product_master' || (global.form_main_table_filters('product_master', $4));
		raise notice '_query_pm%',_query_pm;
		_query_pa := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $5);
		raise notice '_query_pm%',_query_pa;
		_query_table_filters := global.form_table_query($6);
		raise notice '_query_pm%',_query_table_filters;
 		_query_combine :=  '
					select * from (
					select vm.vendor_code,
							vm.vendor_name,
							main.product_name,
							attributes.*, 
							vkm.status as status, 
							vkm.preferred_status
					from
						(' || _query_pm || ') main
					join (' || _query_pa || ') attributes on
						main.product_code = attributes.product_code
					 join ('|| _query_sku_map || ') vkm
					 on vkm.product_code =main.product_code
					  join ('|| _query_vm || ') vm
					 on vm.vendor_code  =vkm.vendor_code 			
						) X' || _query_table_filters;
		raise notice '%',_query_combine;

		if $7 is false then 
			_final_query := _query_combine;
		else
			_final_query := 'select count(*) from (' || _query_combine || ') temp' ;
		end if;
			
		open $1 for execute _final_query;
		RETURN $1;
	end $function$
;


CREATE OR REPLACE FUNCTION global.vendor_product_filter_list(input jsonb, jsonb, jsonb, jsonb, jsonb)
 RETURNS TABLE(vendor_code character varying, vendor_name character varying, product_code character varying, product_name character varying, l0_name character varying, l1_name character varying, l2_name character varying, l3_name character varying, style character varying, style_color character varying, status character varying, preferred_status character varying)
 LANGUAGE plpgsql
AS $function$
	declare
	_query_pm text := '';
	_query_vm text := '';
	_query_pa text := '';
	_query_sku_map text := '';
	_query_table_filters text := '';
	_query_combine text := '';
	/*
	 * Function/Procedure name: global.vendor_product_filter_list
	 * calling statement :
	  select * from  global.vendor_product_filter_list (
	    '{"vendor_name": [{"operator": "in", "type": "list", "values": ["LUCENT JEWELERS INC"]}]}',
	  	'{"status":[],
	  	  "preferred_status":[]	}',
	  	'{"product_name" :[]}',
	  	'{"l0_name" :[], "l1_name" :[], "l2_name" :[], "l3_name" :[], "style" :[],"color_code" :[]}',
	  	'{}'
	  );
	 *
	 *
	 * Updated_by       Updated_on      Purpose
	 * ----------       -----------     --------

	 */
	begin
		_query_vm := 'SELECT * FROM global.vendor_master' || (global.form_main_table_filters('vendor_master', $1));
		raise notice '_query_vm%',_query_vm;
		_query_sku_map := 'SELECT * FROM global.vendor_sku_mapping' || (global.form_main_table_filters('vendor_sku_mapping', $2));
		raise notice '_query_sku_map%',_query_sku_map;
		_query_pm := 'SELECT * FROM global.product_master' || (global.form_main_table_filters('product_master', $3));
		raise notice '_query_pm%',_query_pm;
		_query_pa := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $4);
		raise notice '_query_pm%',_query_pa;
		_query_table_filters := global.form_table_query($5);
		raise notice '_query_pm%',_query_table_filters;
 		_query_combine :=  '
					select * from (
					select vm.vendor_code vendor_id,
							vm.vendor_name,
							main.product_code sku_id,
							main.product_name sku_name,
							attributes.l0_name,
							attributes.l1_name,
							attributes.l2_name ,
							attributes.l3_name,
							attributes.style,
							attributes.color_code,
							vkm.status,
							vkm.preferred_status
					from
						(' || _query_pm || ') main
					join (' || _query_pa || ') attributes on
						main.product_code = attributes.product_code
					 join ('|| _query_sku_map || ') vkm
					 on vkm.product_code =main.product_code
					  join ('|| _query_vm || ') vm
					 on vm.vendor_code  =vkm.vendor_code
						) X' || _query_table_filters;
		raise notice '%',_query_combine;
		return query execute _query_combine;
	end $function$
;
