--liquibase formatted sql
--changeset liquibase:update_rule_store_mapping_v2_carters runOnChange:true stripComments:false splitStatements:false context:MTP-46719 labels:MTP-46719
--comment: initial changeset for update_rule_store_mapping_v2 for carters
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.update_rule_store_mapping_v2(refcursor, validity_list jsonb, filter_list text[], created_by integer, updated_by integer);
CREATE OR REPLACE FUNCTION global.update_rule_store_mapping_v2(refcursor, validity_list jsonb, filter_list text[], created_by integer, updated_by integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
/* 	
	 * Function/Procedure name: global.update_rule_store_mapping
	 * 
	 *
	 * Updated_by       Updated_on      Purpose
	 * ----------       -----------     --------
	 * Akshay Jain		05-MAY-2024  	SP to update mapping data in rcl flow
	 * Arnab Nandy      20-JUNE-2024    Handling both select all and manual select scenario
	 */
DECLARE
    validity_item jsonb;
    query text := '';
    validity_value text;
    filter_item jsonb;
    meta_item jsonb;
    fetch_rule_code_sp text;
    rule_codes_query text;
    rule_codes text[];
    rule_codes_string text;
   	rule_code text;
    rule_codes_list text;
    i int;
    suffix_multiple_dimension_table text := '';
begin
	select attribute_value->>'suffix' from global.tenant_attribute_master tam where name = 'mapping_multidimension_suffix' into suffix_multiple_dimension_table;
	filter_item := filter_list[1];
	raise notice 'filter item %', filter_item;
	if filter_item ? 'rule_code' then
		raise notice 'here';
		SELECT array_agg(element::text)
	    INTO rule_codes
	    FROM jsonb_array_elements_text(filter_item->'rule_code') AS element;
		raise notice 'rule_codes %', array_to_string(rule_codes, ',');
	-- handling scenario when filters are present
	else
		meta_item := filter_list[2];
		fetch_rule_code_sp := filter_list[3];
		query := 'select * from global.rule_list_product_only' || '(' || quote_literal($1) || ',' || quote_literal(filter_item) || ',' || quote_literal(meta_item) || ',' || quote_literal(fetch_rule_code_sp) || ')';
		raise notice 'query: %', query;
		execute query into rule_codes_query;
		rule_codes_query := 'select array(select rule_code from (' || rule_codes_query || ') B)';
		raise notice 'rule_codes_query: %', rule_codes_query;
		execute rule_codes_query into rule_codes;
		close $1;
	end if;
	rule_codes_list := '(' || array_to_string(rule_codes, ',') || ')';
	
    FOR validity_item IN SELECT jsonb_array_elements(validity_list)
    loop
	    	validity_value := COALESCE(validity_item->>'validity', NULL);
   	
		    query = 
	         '
	        INSERT INTO global.rcl_product_mapping_product_store (rcl_code, rule_code, psa_code, validity, created_at, updated_at, created_by,updated_by, psa_name, child_sku)
	        SELECT DISTINCT 
	            rcl_code, 
	            rule_code, 
	            psa_code,
				' || 
	        CASE 
	            WHEN validity_value IS NOT NULL THEN '''' || validity_value || ''''
	            ELSE  ' NULL '
	        END || '::datemultirange,
	            now(), 
	            now(),
				' || created_by || ',
				' || updated_by || ',
	            psa_name, 
	            NULL
	        FROM 
	            global.rcl_product_mapping_product_store_rule rpmpsr
	        JOIN 
	            global.product_store_attributes_filter' || suffix_multiple_dimension_table || ' psaf ON
	            rpmpsr.rcl_dimension->>''l0_name'' = psaf.l0_name
	        WHERE 
	            rule_code in ' || rule_codes_list || '
	            AND psa_name = ''' || (validity_item->>'psa_name')::text || '''
	        ON CONFLICT (rcl_code, rule_code, psa_code) DO UPDATE
	        SET 
	            validity = EXCLUDED.validity,
	            updated_at = now(),
				updated_by = ' || updated_by || '
			';
			raise notice '_query_part: %', query;
			execute query;
	    		
    END LOOP;
    query := 'select 1';
    open $1 for execute query;
END;
$function$
;
