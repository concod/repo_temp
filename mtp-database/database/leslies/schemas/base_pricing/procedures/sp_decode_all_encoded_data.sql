--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:sp_decode_all_encoded_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for sp_decode_all_encoded_data

DROP PROCEDURE IF EXISTS base_pricing.sp_decode_all_encoded_data;


CREATE OR REPLACE PROCEDURE base_pricing.sp_decode_all_encoded_data()
 LANGUAGE plpgsql
AS $procedure$
DECLARE
    tbl TEXT;
    col TEXT;
    sql TEXT;
    v_count INT;
    schema_name TEXT := 'base_pricing';
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

    -- Loop through each target table
    FOREACH tbl IN ARRAY target_tables LOOP
        RAISE NOTICE 'Processing table: %.%', schema_name, tbl;

        -- Loop through each varchar/text column dynamically
        FOR col IN
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = schema_name
              AND table_name = tbl
              AND data_type IN ('character varying', 'text', 'varchar')
        LOOP
            sql := format(
                'UPDATE %I.%I
                 SET %I = base_pricing.fn_decode_special_chars(%I)
                 WHERE %I IS NOT NULL;',
                schema_name, tbl, col, col, col
            );

            RAISE NOTICE 'Executing: %', sql;
            EXECUTE sql;
            GET DIAGNOSTICS v_count = ROW_COUNT;
            RAISE NOTICE '→ Updated % rows in column "%".', v_count, col;
        END LOOP;
    END LOOP;

    RAISE NOTICE '=== Decoding Completed Successfully ===';
    COMMIT;
END;
$procedure$
;
