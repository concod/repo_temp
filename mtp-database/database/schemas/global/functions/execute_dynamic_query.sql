--liquibase formatted sql
--changeset srishti.kumari@impactanalytics.co:execute_dynamic_query runOnChange:true stripComments:false splitStatements:false context:MTP-57431 labels:MTP-57431
--comment: execute_dynamic_query
--rollback: SELECT 1
DROP FUNCTION IF EXISTS "global".execute_dynamic_query(text, _int4);
CREATE OR REPLACE FUNCTION global.execute_dynamic_query(input text, integer[])
 RETURNS TABLE(product_code character varying)
 LANGUAGE plpgsql
AS $function$
/*
 Prepares and executes query from group definition rule
 Input :
  $1: pseudo code rule . for multiple definition join using 'OR'.
  $2: pgr_code for above sub rules.
 Calling Statement:
  select * from global.execute_dynamic_query('Sub_Rule_1 AND Sub_Rule_2', '{150, 151}')
 */
DECLARE
    n varchar;
    a varchar;
    p text;
    attr jsonb := '{}';
    _query text := '';
    _active_filter jsonb := '{"active": [{"type": "list", "operator": "in", "values": [true]}]}';
    _delete_filter jsonb := '{"is_deleted": [{"type": "list", "operator": "in", "values": [false]}]}';
BEGIN
    FOR n, a, p IN 
        SELECT name AS n, attribute_name AS a, 
               concat(attribute_name, ' = any(''', attribute_values, ''')') AS p 
        FROM (
            SELECT name, attribute_name, 
                   REGEXP_REPLACE(attribute_values::text , $$([^'])'([^'])$$, $$\1''\2$$ ,'g') AS attribute_values 
            FROM global.product_group_rules 
            WHERE is_deleted = false AND pgr_code = ANY($2)
        ) x 
        ORDER BY length(name) DESC 
    LOOP
        $1 := regexp_replace($1, '\m' || n || '\M', p); 
        attr := attr || ('{"' || a || '": []}')::jsonb;
    END LOOP;
    
    -- Merging _active_filter, _delete_filter into attr
    attr := attr || _active_filter || _delete_filter;
    
    RAISE NOTICE 'attr : %s', attr;
    _query := global.form_attribute_table_filters_v2('product_attributes', 'product_code', attr);
    _query := 'SELECT product_code FROM (SELECT * FROM (' || _query || ') X WHERE ' || $1 || ') Y';
    
    RAISE NOTICE ' query : %s', _query;
    
    RETURN QUERY EXECUTE _query;
END $function$
;
