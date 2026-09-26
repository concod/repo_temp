--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:pricesmart.fn_get_pg_products_by_filters_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for pricesmart.fn_get_pg_products_by_filters_1

DROP FUNCTION if exists pricesmart.fn_get_pg_products_by_filters;


CREATE OR REPLACE FUNCTION pricesmart.fn_get_pg_products_by_filters(_filters jsonb)
 RETURNS integer[]
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    where_clause TEXT;
    product_ids INT[];
BEGIN
    IF _filters IS NULL THEN
        RAISE EXCEPTION 'filters cannot be null';
    END IF;

    -- Build WHERE clause using your existing helper function
    where_clause := pricesmart.fn_build_hierarchy_where_cluse(_filters);

    -- Execute query to get product_ids
    EXECUTE format(
        'SELECT array_agg(pm.product_id)
         FROM pricesmart.product_master pm
         WHERE %s AND is_active = 1 AND clearance_indicator = 0',
        where_clause
    )
    INTO product_ids;

    IF product_ids IS NULL THEN
        RETURN ARRAY[]::INT[];
    END IF;

    RETURN product_ids;
END;
$function$
;
