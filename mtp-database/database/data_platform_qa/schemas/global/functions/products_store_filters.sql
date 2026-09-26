--liquibase formatted sql
--changeset liquibase:products_store_filters runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for products_store_filters
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.products_store_filters(input jsonb, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION global.products_store_filters(input jsonb, jsonb, jsonb, jsonb)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
	declare
--	_query_pm text := '';
	_query_pa text := '';
--	_query_sm text := '';
	_query_sa text := '';
--	_query_combine_p text := '';
--	_query_combine_s text := '';
	_query_combine text := '';
	begin
		$2 := $1 || $2;
		$4 := $3 || $4;
		--_query_pm := 'SELECT * FROM "global".product_master' || ("global".form_main_table_filters('product_master', $1));
 		_query_pa := "global".form_attribute_table_filters_v2('product_attributes', 'product_code', $2);
 		--_query_sm := 'SELECT * FROM "global".store_master' || ("global".form_main_table_filters('store_master', $3));
 		_query_sa := "global".form_attribute_table_filters_v2('store_attributes', 'store_code', $4);
 		raise notice '%', _query_pa;
 		raise notice '%', _query_sa;
-- 		_query_combine_p := '
--			select
--				main.*,
--				' || (global.extract_keys($2, 'attributes')) || '
--			from
--				(' || _query_pm || ') main
--			join (' || _query_pa || ') attributes on
--				main.product_code = attributes.product_code';
--		_query_combine_s := '
--			select
--				main.*,
--				' || (global.extract_keys($4, 'attributes')) || '
--			from
--				(' || _query_sm || ') main
--			join (' || _query_sa || ') attributes on
--				main.store_code = attributes.store_code';
--		_query_combine := '
--			select
--				p.*, s.*
--			from
--				(' || _query_combine_p || ') p
--			join global.product_store_mapping psm
--				on p.product_code = psm.product_code
--			join (' || _query_combine_s || ') s on
--				psm.store_code = s.store_code';
 		_query_combine := '
			select
				p.*,s.*
			from
				(' || _query_pa || ') p
			-- join global.product_store_mapping psm
			join global.product_mapping_product_store psm
				using(product_code,l0_name)
			join (' || _query_sa || ') s
				using(store_code)
			where psm.is_active = true';
	RETURN _query_combine;
	end $function$
;
