--liquibase formatted sql
--changeset liquibase:product_store_mapping_pg_unmapped_products_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_store_mapping_pg_unmapped_products_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.product_store_mapping_pg_unmapped_products_list(input text[], text, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION global.product_store_mapping_pg_unmapped_products_list(input text[], text, jsonb, jsonb, jsonb)
 RETURNS TABLE(product_code character varying, product_name character varying)
 LANGUAGE plpgsql
AS $function$
declare
	_query_pm text := '';
	_query_pa text := '';
	_query_table_filters text := '';
	_query_combine text;
	_product_codes_len int := array_length($1, 1);
	begin
		_query_pm := 'SELECT * FROM "global".product_master' || ("global".form_main_table_filters('product_master', $3));
 		_query_pa := "global".form_attribute_table_filters_v2('product_attributes', 'product_code', $4);
		_query_table_filters := "global".form_table_query($5);
		_query_combine := '
			select
				*
			from
				(
				select
					pm.product_code,
					product_name
				from
					(
					select
						main.*
					from
						(' || _query_pm || ') main
					join (' || _query_pa || ') attributes on
						main.product_code = attributes.product_code) pm
				join (
					select
						x.product_code
					from
						(
						select
							distinct product_code,
							''' || $2 || ''' as store_code
						from
							global.product_groups_mapping
						where
							pg_code = any(''' || $1::varchar || '''::int[])) x
					left join global.product_store_mapping psm on
						x.store_code = psm.store_code
							and x.product_code = psm.product_code
						where
							psm.product_code is null
				) psm on pm.product_code = psm.product_code
			) X ' || _query_table_filters;
		raise notice '%', _query_combine;
		RETURN QUERY execute _query_combine;
 	end
$function$
;
