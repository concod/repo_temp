--liquibase formatted sql
--changeset pranshu.pandey@impactanalytics.co:pc_build_temp_store_user_selected_hierarchies_table runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: pc_build_temp_store_user_selected_hierarchies_table - Generic procedure for both promo and event

DROP PROCEDURE IF EXISTS price_promo.pc_build_temp_store_user_selected_hierarchies_table;

CREATE OR REPLACE PROCEDURE price_promo.pc_build_temp_store_user_selected_hierarchies_table(
    IN _ids integer[] DEFAULT NULL::integer[],
    IN _is_for_promo boolean DEFAULT TRUE
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    rec1 RECORD;
    select_list TEXT := '';
    agg_list TEXT := '';
    final_sql TEXT;
    _table_name TEXT;
    _id_column TEXT;
    _entity_type TEXT;
BEGIN
    -- Set table and column names based on entity type
    IF _is_for_promo THEN
        _table_name := 'price_promo.promo_store';
        _id_column := 'promo_id';
        _entity_type := 'Promo';
    ELSE
        _table_name := 'price_promo.event_stores';
        _id_column := 'event_id';
        _entity_type := 'Event';
    END IF;

    IF _ids IS NULL OR array_length(_ids, 1) IS NULL THEN
        RAISE NOTICE 'No % IDs provided. Exiting procedure.', _entity_type;
        RETURN;
    END IF;

    FOR rec1 IN
        SELECT id_mapping, request_key, id_column
        FROM pricesmart.pricesmart_hierarchy_mapping
        WHERE is_product_hierarchy = FALSE
        ORDER BY id_mapping
    LOOP
        -- Directly select the hierarchy column from store_master
        select_list := select_list ||
            format(
                '    sm.%I AS %I,' || E'\n',
                rec1.id_column,
                rec1.request_key
            );

        agg_list := agg_list ||
            format(
                '    array_agg(DISTINCT sh.%I) FILTER (WHERE sh.%I IS NOT NULL) AS %I,' || E'\n',
                rec1.request_key, rec1.request_key, rec1.request_key
            );
    END LOOP;

    select_list := regexp_replace(select_list, ',\n$', E'\n');
    agg_list  := regexp_replace(agg_list, ',\n$', E'\n');

    -- Build final SQL using promo_store/event_stores + store_master
    final_sql := format($sql$
        DROP TABLE IF EXISTS tb_refresh_temp_store_actual_hierarchy;
        CREATE TEMP TABLE tb_refresh_temp_store_actual_hierarchy ON COMMIT DROP AS
        WITH store_hierarchies AS (
            SELECT
                s.%I AS entity_id,
                %s
            FROM %s s
            JOIN pricesmart.tb_store_master sm ON sm.store_id = s.store_id
            WHERE s.%I = ANY (%L)
        )
        SELECT
            sh.entity_id AS id,
            %s
        FROM store_hierarchies sh
        GROUP BY sh.entity_id;
    $sql$, _id_column, select_list, _table_name, _id_column, _ids, agg_list);

    RAISE NOTICE 'Generated SQL:%', chr(10) || final_sql;
    EXECUTE final_sql;
END;
$procedure$;
