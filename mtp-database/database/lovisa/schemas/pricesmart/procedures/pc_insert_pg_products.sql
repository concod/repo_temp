--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:pc_insert_pg_products_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: pc_insert_pg_products_2

DROP PROCEDURE if exists pricesmart.pc_insert_pg_products;


CREATE OR REPLACE PROCEDURE pricesmart.pc_insert_pg_products(IN _pg_id integer, IN _products integer[] DEFAULT NULL::integer[], IN _pg_hierarchy_selection jsonb DEFAULT NULL::jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    product_ids INT[];
    where_clause TEXT;
    dyn_sql TEXT;
BEGIN
    IF _pg_id IS NULL THEN
        RAISE EXCEPTION 'pg_id cannot be null';
    END IF;

    -- Case 1: Insert directly from _products array
    IF _products IS NOT NULL AND array_length(_products, 1) > 0 THEN
        dyn_sql := format(
            'INSERT INTO pricesmart.tb_pg_product (pg_id, product_id)
             SELECT %s AS pg_id,
                    CAST(dd1.product_id AS BIGINT)
             FROM (SELECT unnest(ARRAY[%s]::INTEGER[]) product_id) dd1',
            _pg_id, array_to_string(_products, ',')
        );

        EXECUTE dyn_sql;
        RETURN;
    END IF;

    -- Case 2: Insert from hierarchy selection
    IF _pg_hierarchy_selection IS NOT NULL THEN
        -- Generate WHERE clause from helper function
        where_clause := pricesmart.fn_build_hierarchy_where_cluse(_pg_hierarchy_selection);

        -- Get product IDs using dynamic SQL
        EXECUTE format(
            'SELECT array_agg(pm.product_id)
             FROM pricesmart.product_master pm
             WHERE %s AND is_active = 1 AND clearance_indicator = 0',
            where_clause
        ) INTO product_ids;

        IF product_ids IS NULL OR array_length(product_ids, 1) = 0 THEN
            RAISE NOTICE 'No matching products found from hierarchy selection.';
            RETURN;
        END IF;

        -- Insert products
        dyn_sql := format(
            'INSERT INTO pricesmart.tb_pg_product (pg_id, product_id)
             SELECT %s AS pg_id,
                    CAST(dd1.product_id AS BIGINT)
             FROM (SELECT unnest(ARRAY[%s]::INTEGER[]) product_id) dd1',
            _pg_id, array_to_string(product_ids, ',')
        );

        EXECUTE dyn_sql;
        RETURN;
    END IF;

    -- If neither products nor hierarchy selection is provided
    -- RAISE EXCEPTION 'Either _products or _pg_hierarchy_selection must be provided';
END;
$procedure$
;
