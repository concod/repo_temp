--liquibase formatted sql
--changeset shashwat.yadav:get_inventory_filter_data runOnChange:true stripComments:false splitStatements:false context:command-fix labels:command-fix
--comment: Used to get inventory filter data
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_inventory_filter_data(refcursor, varchar, varchar, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.get_inventory_filter_data(input refcursor, p_table_name character varying, p_column_names character varying, p_filter_conditions jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
    _query text;
    condition jsonb;
BEGIN
    _query := 'SELECT ' || p_column_names || ' FROM inventory_smart.' || quote_ident(p_table_name);

    _query := _query || ' WHERE active = true';

    IF p_filter_conditions IS NOT NULL AND jsonb_typeof(p_filter_conditions) = 'array' THEN
        IF jsonb_array_length(p_filter_conditions) > 0 THEN
            FOR condition IN 
                SELECT value::jsonb FROM jsonb_array_elements(p_filter_conditions)
            LOOP
                _query := _query || ' AND ';
                
                _query := _query 
                    || (condition->>'filter_id') || ' ' 
                    || COALESCE(condition->>'operator', '=') || ' ' 
                    || '(' 
                    || (SELECT string_agg(quote_literal(value::text), ', ') 
                        FROM jsonb_array_elements_text(condition->'values')) 
                    || ')';
            END LOOP;
        END IF;
    END IF;

    RAISE NOTICE 'query: %', _query;
    OPEN $1 FOR EXECUTE _query;
    RETURN $1;
END
$function$
;