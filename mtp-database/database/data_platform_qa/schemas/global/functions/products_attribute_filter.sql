--liquibase formatted sql
--changeset liquibase:products_attribute_filter runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for products_attribute_filter
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.products_attribute_filter(input refcursor, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION global.products_attribute_filter(input refcursor, jsonb, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
	declare
	_query_pm text := '';
	_query_pa text := '';
	_query_table_filters text := '';
	_query_combine text := '';
	begin
		_query_pm := 'SELECT * FROM "global".product_master' || ("global".form_main_table_filters('product_master', $2));
 		_query_pa := "global".form_attribute_table_filters_v2('product_attributes', 'product_code', $3);
		_query_table_filters := "global".form_table_query($4);
 		_query_combine := 'SELECT
			main.product_name,
			main.product_description,
			main.price,
			main.cost,
			main.original_price,
			main.active,
			main.clearance,
			main.receipt_date,
			main.replacement_product_codes,
			main.reference_product_codes,
			attributes.* FROM (' || _query_pm || ') main JOIN (' || _query_pa || ') attributes ON main.product_code = attributes.product_code';
	-- perform global.freeze_list($1::varchar, _query_combine, 'products_attribute_filter'::varchar);
 	OPEN $1 FOR execute 'SELECT * FROM (' || _query_combine || ') X ' || _query_table_filters;
	RETURN $1;
	end $function$
;
