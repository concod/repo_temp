--liquibase formatted sql
--changeset siddharth.bajpai@impactanalytics.co:fn_reporting_get_products_25112025 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_reporting_get_products

DROP FUNCTION IF EXISTS price_markdown_opt.fn_reporting_get_products;

CREATE OR REPLACE FUNCTION price_markdown_opt.fn_reporting_get_products(_product_hierarchy jsonb)
 RETURNS TABLE(l0_id text, l0_name text, l1_id text, l1_name text, l2_id text, l2_name text, l3_id text, l3_name text, l4_id text, l4_name text, l5_id text, l5_name text, l6_id text, l6_name text, l7_id text, l7_name text, product_id bigint, cost double precision, age_bucket text, msrp double precision, current_price double precision, lifecycle_indicator text, product_description text, currency_id integer, clearance_indicator integer )
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
        WHERE is_product_hierarchy = TRUE
          AND is_attribute = FALSE
    LOOP
        -- extract values from JSON (_product_hierarchy -> request_key)
        SELECT string_agg(quote_literal(value::int), ',')
        INTO vals
        FROM jsonb_array_elements_text(_product_hierarchy -> _key);

        -- if the JSON contained that key, add it as a _filter
        IF vals IS NOT NULL THEN
            _filter := _filter || format(' AND pm.%I = ANY (ARRAY[%s]::int[])', col, vals);
        END IF;
    END LOOP;

    -- build and run final SQL
    sql := format($$
        SELECT
            pm.l0_id::text, pm.l0_name::text,
            pm.l1_id::text, pm.l1_name::text,
            pm.l2_id::text, pm.l2_name::text,
            pm.l3_id::text, pm.l3_name::text,
            pm.l4_id::text, pm.l4_name::text,
            pm.l5_id::text, pm.l5_name::text,
            pm.l6_id::text, pm.l6_name::text,
            pm.l7_id::text, pm.l7_name::text,
            pm.product_id::bigint,
            pm.cost::double precision,
            pm.age_month_bucket as age_bucket,
            pm.msrp_with_vat::double precision,
            pm.current_price_with_vat::double precision,
            pm.status::text as lifecycle_indicator,
            pm.product_name as product_description,
            pm.currency_id :: int, pm.clearance_indicator::int
        FROM pricesmart.product_master pm
        WHERE pm.is_active = 1 %s
    $$, _filter);
    
    RAISE NOTICE 'Executing SQL: %', sql;

    RETURN QUERY EXECUTE sql;
END;
$function$;