--liquibase formatted sql
--changeset liquibase:vendor_product_ordering_table_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for vendor_product_ordering_table_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.vendor_product_ordering_table_list(input jsonb, jsonb, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION global.vendor_product_ordering_table_list(input jsonb, jsonb, jsonb, jsonb, jsonb)
 RETURNS TABLE(vendor_code character varying, vendor_name character varying, product_code character varying, product_name character varying, min_order_quantity integer, multiple_quantity integer, cycle_time integer, mfg_lead_time integer, landed_cost double precision)
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
					select vm.vendor_code,
							vm.vendor_name,
							main.product_code,
							main.product_name,
							vkm.min_order_quantity,
							vkm.multiple_quantity,
							vkm.cycle_time,
							vkm.mfg_lead_time,
							vkm.landed_cost
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
