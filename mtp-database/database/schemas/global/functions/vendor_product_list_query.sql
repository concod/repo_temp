--liquibase formatted sql
--changeset liquibase:vendor_product_list_query runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for vendor_product_list_query
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.vendor_product_list_query(input jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION global.vendor_product_list_query(input jsonb, jsonb, jsonb)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
 /*
  * Function prepares vendor master - product query
  * args:
  * 	$1: vendor master filter
  * 	$2: vendor sku mapping fields filter
  * 	$3: product attributes filter
  *
  * Author :
  * 	Pradeep Nayak, 26-07-2022
  *
  */
	declare
		_query_pa text := '';
		_query_vm text := '';
		_query_vsku text := '';
		_key text;
		_value text;
		-- need to figure out dynamically for each column.
		_dt text := 'varchar';
		_filter text;
		_con text[];
		_list_values text;
		_where text = '';
		_combine_where text[];
		_attr_cols text[] := array['vendor_code', 'product_code']::text[];
		_query_combine text;
	begin
		_query_pa := "global".form_attribute_table_filters_v2('product_attributes', 'product_code', $3);
		raise notice ' _query_pa query : % ', _query_pa;
		_query_vm := 'SELECT * FROM "global".vendor_master' || ("global".form_main_table_filters('vendor_master', $1));
		raise notice ' _query_vm query : % ', _query_vm;
		-- prepare query for vendor-sku attributes.
		_query_vsku := 'SELECT * FROM global.vendor_sku_mapping' || (global.form_main_table_filters('vendor_sku_mapping', $2));
		raise notice '_query_vsku : %', _query_vsku;
		_query_combine := '
				select vmain.*, vattr.*, attributes.* from
				('|| _query_vm || ') vmain
				join
				(' || _query_vsku || ') vattr
				on
				vattr.vendor_code = vmain.vendor_code
				join
				(' || _query_pa || ') attributes on
				vattr.product_code = attributes.product_code
			';
		raise notice ' combined query : % ', _query_combine;
	return _query_combine;

 end $function$
;
