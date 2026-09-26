--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:pc_insert_pg_products_hierarchy_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: pc_insert_pg_products_hierarchy_1

DROP PROCEDURE if exists pricesmart.pc_insert_pg_products_hierarchy;


CREATE OR REPLACE PROCEDURE pricesmart.pc_insert_pg_products_hierarchy(IN _pg_id integer, IN _products_ids integer[])
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    rec RECORD;
    dyn_sql TEXT := '';
    first_query BOOLEAN := true;
    agg_cols TEXT := '';
    agg_select TEXT := '';
BEGIN
    -- Step 1: Insert into tb_pg_hierarchy (existing logic)
    FOR rec IN
        SELECT id_mapping, id_column, value_column
        FROM pricesmart.pricesmart_hierarchy_mapping
        WHERE is_product_hierarchy = TRUE
        ORDER BY id_mapping
    LOOP
        IF NOT first_query THEN
            dyn_sql := dyn_sql || ' UNION ';
        ELSE
            first_query := FALSE;
        END IF;

        dyn_sql := dyn_sql || format(
            $fmt$
            SELECT DISTINCT
                   %L::INT AS pg_id,
                   %s::INT AS hierarchy_level,
                   pm.%I::INT AS hierarchy_value,
                   pm.%I AS hierarchy_name,
                   1 AS is_temporary
            FROM pricesmart.product_master pm
            JOIN unnest(%L::INT[]) AS pid(product_id)
              ON pm.product_id = pid.product_id
            WHERE pm.%I IS NOT NULL
              AND pm.%I IS NOT NULL
            $fmt$,
            _pg_id,
            rec.id_mapping,
            rec.id_column,
            rec.value_column,
            _products_ids,
            rec.id_column,
            rec.value_column
        );
    END LOOP;

    IF dyn_sql IS NOT NULL AND dyn_sql <> '' THEN
        dyn_sql := 'INSERT INTO pricesmart.tb_pg_hierarchy (pg_id, hierarchy_level, hierarchy_value, hierarchy_name, is_temporary) ' ||
                   'SELECT * FROM (' || dyn_sql || ') AS sub ' ||
                   'ON CONFLICT (pg_id, hierarchy_level, hierarchy_value) DO NOTHING;';
        RAISE NOTICE 'Executing Hierarchy Insert: %', dyn_sql;
        EXECUTE dyn_sql;
    END IF;

    -- Step 2: Aggregate data for tb_pg_hierarchy_agg_data
    agg_cols := 'pg_id';
    agg_select := format('%s AS pg_id', _pg_id);

    FOR rec IN
        SELECT id_mapping, request_key
        FROM pricesmart.pricesmart_hierarchy_mapping
        WHERE is_product_hierarchy = TRUE
        ORDER BY id_mapping
    LOOP
        -- Add column name
        agg_cols := agg_cols || ', ' || quote_ident(rec.request_key);

        -- Select aggregated values from tb_pg_hierarchy
        agg_select := agg_select || format(
            ', (SELECT ARRAY_AGG(DISTINCT hierarchy_value) 
               FROM pricesmart.tb_pg_hierarchy 
               WHERE pg_id = %s AND hierarchy_level = %s)', 
            _pg_id, rec.id_mapping);
    END LOOP;

    dyn_sql := format(
        'INSERT INTO pricesmart.tb_pg_hierarchy_agg_data (%s) SELECT %s;',
        agg_cols, agg_select);

    RAISE NOTICE 'Executing Aggregate Insert from tb_pg_hierarchy: %', dyn_sql;
    EXECUTE dyn_sql;
END;
$procedure$
;
