--liquibase formatted sql
--changeset jitendra.singh:return_table runOnChange:true stripComments:false splitStatements:false context:MTP-48034 labels:MTP-48034
--comment: remove l1, l3 and l4 condition
--rollback: SELECT 1
--function to get eligible stores in product;
DROP FUNCTION IF EXISTS inventory_smart.get_product_store_band_eligible_store(jsonb, text);
CREATE OR REPLACE FUNCTION inventory_smart.get_product_store_band_eligible_store(product_store_band jsonb, vl_unique_identifier text)
 RETURNS TABLE(product_code text, psa_name character varying, store_code text)
 LANGUAGE plpgsql
AS $function$
 	declare
 		_rcl_input_query_f text := '';
		_rcl_input_query text := '';
		_rcl_input_table text := '';
		_l0_name text := '';
		_l1_name text := '';
		_l3_name text := '';
		_l4_name text := '';
		_query    text := '';
 	begin
		_rcl_input_table := 'public.rcl_psm_input_data_' || vl_unique_identifier;
		SELECT
	        l0_name, l1_name, l3_name, l4_name
	    INTO
	        _l0_name, _l1_name, _l3_name, _l4_name
	    FROM
	        global.product_attributes_filter paf
	    WHERE
	        article = (cast(product_store_band AS jsonb)->0->>'article');
	    _rcl_input_query_f := '
			SELECT
			    pmap.product_code,
			    psaf.psa_name,
			    psaf.store_code,
				psaf.psa_code
			FROM (
			    SELECT
			        x->>''article'' AS product_code,
			        jsonb_array_elements_text(x->''store_bands'') AS store_band
			    FROM
			        jsonb_array_elements('''||(product_store_band)::json||''') x
			) pmap
			join global.product_attributes_filter paf on paf.article = pmap.product_code
			JOIN (
				select psa_name, store_code, psa_code, l0_name, l3_name, l1_name, l4_name from
				global.product_store_attributes_filter
				where l0_name = '''||_l0_name||'''
				--and l1_name = '''||_l1_name||'''
				--and l3_name = '''||_l3_name||'''
				--and l4_name = '''||_l4_name||'''
			) psaf on pmap.store_band = psaf.psa_name and paf.l4_name = psaf.l4_name and paf.l0_name = psaf.l0_name and paf.l1_name = psaf.l1_name and paf.l3_name = psaf.l3_name
		';
        raise notice '_rcl_input_query_f: %', _rcl_input_query_f;
		execute 'drop table if exists ' || _rcl_input_table ||' cascade; ';
		_rcl_input_query:= 'create unlogged table ' || _rcl_input_table || ' as ( ' || _rcl_input_query_f || ' );';
		raise notice '_rcl_input_query: %', _rcl_input_query;
		execute _rcl_input_query;
		_query := '
			select
				grpd.product_code,
				psaf.psa_name,
				grpd.store_code as store_code
			from
				global.generate_rcl_psm_data('''||_rcl_input_table||''', 32, current_date) grpd
            join global.product_attributes_filter paf on paf.article = grpd.product_code
			INNER JOIN (
				select psa_name, store_code, l0_name, l3_name, l1_name, l4_name from
				global.product_store_attributes_filter
				where l0_name = '''||_l0_name||'''
				--and l1_name = '''||_l1_name||'''
				--and l3_name = '''||_l3_name||'''
				--and l4_name = '''||_l4_name||'''
			) psaf on grpd.store_code = psaf.store_code and paf.l4_name = psaf.l4_name and paf.l0_name = psaf.l0_name and paf.l1_name = psaf.l1_name and paf.l3_name = psaf.l3_name
		';
		raise notice 'query: %', _query;
		return query execute _query;
 	end
 $function$
;
