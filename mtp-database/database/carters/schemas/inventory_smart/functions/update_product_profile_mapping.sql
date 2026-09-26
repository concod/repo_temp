--liquibase formatted sql
--changeset adesh.kumar:update_product_profile_mapping runOnChange:true stripComments:false splitStatements:false context:MTP-37903 labels:MTP-37903
--comment: MTP-37903:intial-changeset-ia-recommended-edit
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.update_product_profile_mapping(data jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.update_product_profile_mapping(data jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    records jsonb;
    store_code_val text;
    pp_code_val int;
    overall_proportion_val numeric;
    store_codes text[] := '{}'; 
    pp_codes int[] := '{}';
    overall_proportions numeric[] := '{}';
    query text;
   	update_query text;
  	store_codes_str text;
 	pp_codes_str text;
	overall_proportions_codes_str text;
BEGIN
    FOR records IN SELECT * FROM jsonb_array_elements($1::jsonb) loop  
        store_code_val := records ->> 'store_code';
        pp_code_val := (records ->> 'pp_code')::int;
        overall_proportion_val := (records ->> 'overall_proportion')::numeric;

        -- Append values to arrays
        store_codes := array_append(store_codes, store_code_val);
        pp_codes := array_append(pp_codes, pp_code_val);
        overall_proportions := array_append(overall_proportions, overall_proportion_val);
    END LOOP;
  	store_codes_str := array_to_string(store_codes, ',');
 	store_codes_str := '''{' || store_codes_str || '}''';
 	pp_codes_str := array_to_string(pp_codes, ',');
 	pp_codes_str := '''{' || pp_codes_str || '}''';
	overall_proportions_codes_str := array_to_string(overall_proportions, ',');
 	overall_proportions_codes_str := '''{' || overall_proportions_codes_str || '}''';
   update_query := 
    'UPDATE inventory_smart.product_profile_mapping AS m
    SET overall_proportion = upd.overall_proportion
    FROM (
        SELECT store_code, pp_code, overall_proportion,
               ROW_NUMBER() OVER () AS row_num
        FROM unnest( ' || store_codes_str || '::text[] ) WITH ORDINALITY AS s(store_code, ordinality)
        JOIN unnest( ' || pp_codes_str ||'::int[] )  WITH ORDINALITY AS p(pp_code, ordinality) USING (ordinality)
        JOIN unnest( ' || overall_proportions_codes_str ||'::numeric[] ) WITH ORDINALITY AS o(overall_proportion, ordinality) USING (ordinality)
    ) AS upd
    WHERE m.store_code = upd.store_code
      AND m.pp_code = upd.pp_code;';
     raise notice '%', update_query;
    execute update_query;
END;
$function$
;
