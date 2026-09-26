--liquibase formatted sql
--changeset liquibase:rcl_create_add_configuration_1 runOnChange:true stripComments:false splitStatements:false context:MTP-86607 labels:MTP-86607
--comment: MTP-86607 included all the hierarchy list columns when joining with filtered_paf
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.rcl_create_add_configuration(text, jsonb, int4, int4);
CREATE OR REPLACE FUNCTION inventory_smart.rcl_create_add_configuration(
    temp_tbl_name TEXT, 
    _product_filters JSONB, 
    _rcl_code INTEGER, 
    _created_by INTEGER,
    _is_rule_store_level_configuration BOOLEAN DEFAULT FALSE
)
RETURNS VOID
LANGUAGE plpgsql
AS $function$
DECLARE
    _query_part TEXT;
    _query_combine TEXT;
    _rule_filter TEXT;
    _index_query TEXT;
    _product_filter TEXT;
    _hierarchy TEXT;
    _key TEXT;
    _value TEXT;
    _keys TEXT[];
    _jsonb_arr TEXT[];
    _jsonb_body TEXT;
    v_gen_random_uuid TEXT := gen_random_uuid()::VARCHAR;
    _filtered_products_temp_table TEXT;
    _temp_table_query TEXT;
    _index_creation_query TEXT;
BEGIN
    --  Build product filter SQL from input JSON
    _product_filter := global.form_rcl_product_validity_filter($2, '{}');
    _product_filter := replace(REPLACE(_product_filter, '(rcl_dimension->>''', ''), ''')', '');

    --  Collect JSONB keys into an array
    FOR _key, _value IN 
        SELECT * FROM jsonb_each_text($2) 
    LOOP
        RAISE NOTICE 'value2: %', _value;
        _keys := array_append(_keys, _key);
    END LOOP;

    --  Build jsonb_build_object argument list
    FOREACH _key IN ARRAY _keys LOOP
        _jsonb_arr := array_append(_jsonb_arr, '''' || _key || '''' || ', ' || _key);
        RAISE NOTICE 'jsonb_arr: %', _jsonb_arr;
    END LOOP;

    _jsonb_body := array_to_string(_jsonb_arr, ', ');
    RAISE NOTICE 'jsonb_body: %', _jsonb_body;

    --  Create temporary table with filtered products
    _filtered_products_temp_table := 'temp_filtered_products_' || replace(gen_random_uuid()::TEXT, '-', '');
    _temp_table_query := 'CREATE TEMPORARY TABLE ' || _filtered_products_temp_table || ' AS 
                          SELECT * 
                          FROM global.product_attributes_filter paf 
                          ' || _product_filter;

    RAISE NOTICE 'Creating temporary filtered products table: %', _filtered_products_temp_table;
    RAISE NOTICE 'Temp table creation query: %', _temp_table_query;
    EXECUTE _temp_table_query;

    --  Main query to create configuration table
	--  If the rcl dimension is not present in the rcl table or if the rcl dimension is present in the rcl table and is expired, create those rules.
    _query_part := 'CREATE TABLE public.' || $1 || ' AS
                    SELECT DISTINCT x.*
                    FROM (
                        SELECT jsonb_build_object(' || _jsonb_body || ') AS rcl_dimension,
                               NULL::INT4 AS rcl_code,
                               ''''::VARCHAR AS rule_name,
                               NULL::INTEGER[] AS default_store_groups,
                               NULL::INT4 AS default_product_profile,
                               NULL::INT4 AS auto_allocation_rule,
                               NULL::INT4 AS auto_allocation_schedular,
                               NULL::INT4 AS dc_store_rule,
                               NULL::DATERANGE AS validity,
                               ' || _created_by || '::INT4 AS created_by,
                               ' || quote_literal(NOW()) || '::TIMESTAMP AS created_at,
                               nextval(''inventory_smart.rcl_dc_store_policy_rule_rule_code_seq'') AS rule_code
                        FROM ' || _filtered_products_temp_table || '
                        GROUP BY 1,2,3,4,5,6,7,8,9,10,11
                    ) x
                    LEFT JOIN inventory_smart.rcl_dc_store_policy_rule rcmr 
                           ON x.rcl_dimension = rcmr.rcl_dimension
                    WHERE rcmr.rcl_dimension IS NULL
                       OR NOT EXISTS (
                           SELECT 1
                           FROM inventory_smart.rcl_dc_store_policy rcm
                           JOIN inventory_smart.rcl_dc_store_policy_rule rcmro 
                                USING(rcl_code, rule_code)
                           WHERE rcmro.rcl_dimension = rcmr.rcl_dimension
                             AND upper(validity) > CURRENT_DATE
                             AND NOT rcm.is_deleted
                       );';

    RAISE NOTICE '_query_part: %', _query_part;

    PERFORM global.sp_log(
        v_gen_random_uuid, 
        'inventory_smart.rcl_create_add_configuration', 
        'Before returning function value',
        _query_part,
        jsonb_build_object(
            '_temp_tbl_name', $1,
            '_product_filters', $2,
            '_rcl_code', $3,
            '_created_by', $4,
            '_is_rule_store_level_configuration', $5
        )
    );		

    EXECUTE _query_part;

    --  Store-level configuration logic
    IF _is_rule_store_level_configuration THEN
        -- Create index on l6_name for performance
        _index_creation_query := 'CREATE INDEX ON ' || _filtered_products_temp_table || ' (l6_name)';
        RAISE NOTICE 'Creating index on temporary table: %', _index_creation_query;
        EXECUTE _index_creation_query;

        --  Create store-level table linked to configuration
        _query_part := 'CREATE TABLE public.' || $1 || '_store_level AS
                        WITH psaf_cte AS (
                            SELECT jsonb_build_object(' || _jsonb_body || ') AS rcl_dimension,
                                   psaf.store_code,
                                   saf.store_name,
                                   saf.channel
                            FROM global.product_store_attributes_filter psaf
                            JOIN global.store_attributes_filter saf USING (store_code)
                            JOIN (
                                SELECT subbrand_code_desc, collection, sub_collection, 
                                       masterstyle_descr, l6_name, product_lifecycle, l7_name
                                FROM ' || _filtered_products_temp_table || '
                                GROUP BY 1,2,3,4,5,6,7
                            ) AS filtered_paf USING(l6_name)
                            WHERE psaf.terminal_flag = 1
                        )
                        SELECT DISTINCT
                               t.rcl_dimension,
                               t.rcl_code,
                               t.rule_code,
                               t.validity,
                               psaf_cte.store_code,
                               psaf_cte.store_name,
                               psaf_cte.channel,
                               NULL::INT4 AS auto_allocation_schedular,
                               t.created_by,
                               t.created_at
                        FROM psaf_cte
                        JOIN public.' || $1 || ' AS t
                          ON md5(psaf_cte.rcl_dimension::TEXT) = md5(t.rcl_dimension::TEXT);';

        RAISE NOTICE '_query_part for store level: %', _query_part;
        EXECUTE _query_part;
    END IF;

    -- Clean up temporary table
    RAISE NOTICE 'Cleaning up temporary table: %', _filtered_products_temp_table;
    EXECUTE 'DROP TABLE IF EXISTS ' || _filtered_products_temp_table;

END
$function$;