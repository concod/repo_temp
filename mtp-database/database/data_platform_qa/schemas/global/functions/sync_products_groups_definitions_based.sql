--liquibase formatted sql
--changeset chaitanyaprasad:sync_products_groups_definitions_based_MTP_40307 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_products_groups_definitions_based_MTP_40307
--comment: made sync_products_groups_definitions_based generic to support all clients
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.sync_products_groups_definitions_based();
CREATE OR REPLACE FUNCTION global.sync_products_groups_definitions_based()
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
    _groups_fetch_query_string text;
    _pg_code int;
    _pg_name text;
    _definition_codes int[];
    _active_filter JSON := '{"active": [{"type": "list", "operator": "in", "values": [true]}]}';
    _meta_filter JSON := '{"search": [], "range": [], "query_type": "AND"}';
    _products_in_definition_grp_string text;
    _combined_each_group_definition_string text;
    _pseudo_codes_arr text[];
    _sub_rules_arr int[];
    _product_fetch_under_definition_query text := '';
    _product_fetch_under_group_query text := '';
    _old_product_removal_query text := '';
    _newly_added_diff_query text := '';
    pg_record jsonb;
    _query_string text;
    _sub_rules jsonb;
    _pseudo_code text;
    query TEXT;
    _definition_code int;
    _product_attribute_definition_group_diff_insert_query text;
    _old_product_diff_query text;
    pg_record_json jsonb;
   	_sub_rule INT;
BEGIN 
    -- Construct the query string
    _groups_fetch_query_string := '
        SELECT 
            json_build_object(
                ''pg_code'', pg_code,
                ''name'', name,
                ''definitions_arr'', 
                ARRAY(
                    SELECT CAST(unnested_element AS INTEGER)
                    FROM unnest(string_to_array(trim(''[]'' FROM (selection_metadata->>''definitions'')), '','')) AS unnested_element
                )
            ) AS result
        FROM 
            global.product_groups 
        WHERE
			is_deleted is false AND 
            selection_metadata->''definitions'' IS NOT NULL 
            AND json_array_length(selection_metadata->''definitions'') > 0
    ';

    FOR pg_record IN EXECUTE _groups_fetch_query_string LOOP
        RAISE NOTICE '%', pg_record;
        _pg_code := pg_record->>'pg_code';
        _pg_name := pg_record->>'name';
        RAISE NOTICE '%', jsonb_array_elements(pg_record->'definitions_arr');
        _definition_codes := ARRAY(
            SELECT (elem)::INT
            FROM jsonb_array_elements(pg_record->'definitions_arr') AS elem
        );

        RAISE NOTICE '% ', _definition_codes;
        _combined_each_group_definition_string := '';

        -- Loop over definition codes
        FOREACH _definition_code IN ARRAY _definition_codes LOOP
            RAISE NOTICE '%', _definition_code;
            _query_string := '
                SELECT rules, pseudo_code
                FROM global.product_group_definition_list(' || _definition_code || ',''{}'')';

            RAISE NOTICE '%', _query_string;

            -- Execute the query string
            EXECUTE _query_string INTO _sub_rules, _pseudo_code;

            RAISE NOTICE 'sub rules and psedocode %', _sub_rules;
           	raise notice 'pseudoce %', _pseudo_code;

            -- Parse pgr_codes from the rules array
            FOR _sub_rule IN
                SELECT DISTINCT (rule->>'pgr_code')::INT AS pgr_code
                FROM jsonb_array_elements(_sub_rules) AS rule
            loop
	            raise notice 'subrule %',_sub_rule; 
                -- Do something with _sub_rule.pgr_code
                -- For example: raise notice '%', _sub_rule.pgr_code;
                _sub_rules_arr := array_append(_sub_rules_arr, _sub_rule);
            END LOOP;

            _pseudo_codes_arr := ARRAY_APPEND(_pseudo_codes_arr, '(' || _pseudo_code || ')');
        END LOOP;
       	raise notice '% %', _sub_rules_arr, _pseudo_codes_arr;
       	raise notice '%', array_to_string(_pseudo_codes_arr , ' OR ');
       

        -- Now fetch matching products under the definition
        _product_fetch_under_definition_query := 'SELECT * from "global".product_groups_products_list_by_pseudo_code( ' || quote_literal(_active_filter) || ', jsonb_build_object(), ' || quote_literal(_meta_filter) || ', ''' || array_to_string(_pseudo_codes_arr, ' OR ') || ''', ARRAY[' || array_to_string(_sub_rules_arr, ',') || '])';

        raise notice ' product fetch definition query %', _product_fetch_under_definition_query;

        -- Then fetch products under the group
        _product_fetch_under_group_query := 'SELECT product_code FROM "global".product_groups_mapping WHERE pg_code = ' || _pg_code;

        -- Insert the diff
        -- A-B = newly add products
        -- B-A = removing products
        _newly_added_diff_query := '( select product_code from ( '||  _product_fetch_under_definition_query || ' )dpg ) EXCEPT ' || _product_fetch_under_group_query;
        raise notice '% newly added diff ', _newly_added_diff_query;
        _product_attribute_definition_group_diff_insert_query := '
            INSERT INTO "global".product_groups_mapping
                (pg_code, product_code)
            SELECT ' || quote_literal(_pg_code) || ', pgr.product_code
            FROM (SELECT DISTINCT product_code FROM (' || _newly_added_diff_query || ') AS x) AS pgr
            ON CONFLICT DO NOTHING
        ';

        RAISE NOTICE '_product_attribute_definition_group_diff_insert_query: % ', _product_attribute_definition_group_diff_insert_query;

        Execute _product_attribute_definition_group_diff_insert_query;

        -- Remove the diff
        _old_product_diff_query := _product_fetch_under_group_query || ' EXCEPT ' || '( select product_code from ( '||  _product_fetch_under_definition_query || ' ) dpg )';
        
        raise notice '% old diff query', _old_product_diff_query;
        
        _old_product_removal_query := 'DELETE FROM "global".product_groups_mapping
            WHERE pg_code = ' || _pg_code || ' and product_code IN (
                SELECT product_code
                FROM (
                    ' || _old_product_diff_query || '
                ) x
            )
        ';

        RAISE NOTICE '_product_attribute_definition_group_diff_insert_query: % ', _old_product_removal_query;

        Execute _old_product_removal_query;
       
    END LOOP;
END;
$function$
;
