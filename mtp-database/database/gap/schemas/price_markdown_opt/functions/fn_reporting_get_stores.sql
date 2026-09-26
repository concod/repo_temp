--liquibase formatted sql
--changeset siddharth.bajpai@impactanalytics.co:fn_reporting_get_products_25112025 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_reporting_get_stores

DROP FUNCTION IF EXISTS price_markdown_opt.fn_reporting_get_stores;

CREATE OR REPLACE FUNCTION price_markdown_opt.fn_reporting_get_stores(_store_hierarchy jsonb)
RETURNS TABLE(s0_id text, s0_name text, s1_id text, s1_name text, s2_id text, s2_name text, s3_id text, s3_name text, s4_id text, s4_name text, s5_id text, s5_name text, s6_id text, s6_name text, store_id bigint)
LANGUAGE plpgsql
AS $function$
DECLARE
    sql text;
    _filter text := '';
    _key text;
    col text;
    vals text;
BEGIN
    -- build dynamic conditions based on active hierarchy levels
    FOR _key, col IN
        SELECT request_key, id_column
        FROM pricesmart.pricesmart_hierarchy_mapping phm
        WHERE is_product_hierarchy = FALSE
          AND is_attribute = FALSE
    LOOP
        -- extract values from JSON (_store_hierarchy -> request_key)
        SELECT string_agg(quote_literal(value::int), ',')
        INTO vals
        FROM jsonb_array_elements_text(_store_hierarchy -> _key);

        -- if the JSON contained that key, add it as a filter
        IF vals IS NOT NULL THEN
            _filter := _filter || format(' AND sm.%I = ANY (ARRAY[%s]::int[])', col, vals);
        END IF;
    END LOOP;

    -- build and run final SQL
    sql := format($$
        SELECT
            sm.s0_id::text, sm.s0_name::text,
            sm.s1_id::text, sm.s1_name::text,
            sm.s2_id::text, sm.s2_name::text,
            sm.s3_id::text, sm.s3_name::text,
            sm.s4_id::text, sm.s4_name::text,
            sm.s5_id::text, sm.s5_name::text,
            sm.store_id::text as s6_id, sm.store_name::text as s6_name,
            sm.store_id::bigint
        FROM price_markdown.tb_store_master sm
        WHERE sm.is_active = 1 %s
    $$, _filter);
    
    RAISE NOTICE 'Executing SQL: %', sql;

    RETURN QUERY EXECUTE sql;
END;
$function$;