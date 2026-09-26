--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:sp_decode_all_encoded_data_3 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for sp_decode_all_encoded_data_3

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_decode_all_encoded_data;


CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_decode_all_encoded_data()
 LANGUAGE plpgsql
AS $procedure$
DECLARE
    tbl TEXT;
    sql TEXT;
    set_clause TEXT;
    where_clause TEXT;
    v_count BIGINT;
    schema_name TEXT := 'base_pricing_restaurant';
    target_tables TEXT[] := ARRAY[
        'bp_product_master',
        'bp_product_attributes',
        'bp_store_master',
        'bp_competitor_mapping',
        'bp_customer_segment_config',
        'bp_competitor_attributes',
        'bp_bucket_config',
        'bp_customer_segment_master'
    ];
BEGIN
    RAISE NOTICE '=== Starting Decoding Process ===';

    FOREACH tbl IN ARRAY target_tables LOOP
        RAISE NOTICE 'Processing table: %.%', schema_name, tbl;

        -- Build SET for all text/varchar cols
        SELECT Recommend.set_clause, Recommend.where_clause
        INTO set_clause, where_clause
        FROM (
            SELECT
                string_agg(
                    format('%I = base_pricing_restaurant.fn_decode_special_chars(%I)', column_name, column_name),
                    ', '
                ) AS set_clause,
                string_agg(
                    format('%I ILIKE %L', column_name, '%__ia_char_%'),
                    ' OR '
                ) AS where_clause
            FROM information_schema.columns
            WHERE table_schema = schema_name
              AND table_name = tbl
              AND data_type IN ('character varying', 'text')
        ) Recommend;

        IF set_clause IS NULL THEN
            RAISE NOTICE '→ No text/varchar columns found, skipping.';
            CONTINUE;
        END IF;

        sql := format(
            'UPDATE %I.%I SET %s WHERE %s;',
            schema_name, tbl, set_clause, where_clause
        );

        EXECUTE sql;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE '→ Updated % rows in table "%".', v_count, tbl;
    END LOOP;

    RAISE NOTICE '=== Decoding Completed Successfully ===';
END;
$procedure$
;
