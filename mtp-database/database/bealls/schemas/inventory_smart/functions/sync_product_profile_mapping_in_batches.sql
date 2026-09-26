--liquibase formatted sql
--changeset ujjawal.singh@impactanalytics.co:sync_product_profile_mapping_in_batches runOnChange:true stripComments:false splitStatements:false context:Release_1_1 
--comment: adding procedure for sync_product_profile_mapping_in_batches_01


DROP FUNCTION IF EXISTS inventory_smart.sync_product_profile_mapping_in_batches();

CREATE OR REPLACE PROCEDURE inventory_smart.sync_product_profile_mapping_in_batches(IN batch_size integer DEFAULT 100)
 LANGUAGE plpgsql
AS $procedure$
DECLARE
    _batch_start INT := 1;
    _batch_end   INT;
    _total_stores INT;
    _inserted INT;
BEGIN
    RAISE NOTICE '🚀 Starting full sync for product_profile_mapping (batch size = % stores per batch)', batch_size;

    -- Optional: uncomment for full rebuild
    -- TRUNCATE TABLE inventory_smart.product_profile_mapping;

    -- Step 1: Create numbered store list
    CREATE TEMP TABLE tmp_store_codes AS
    SELECT
        store_code,
        ROW_NUMBER() OVER (ORDER BY store_code) AS rn
    FROM (
        SELECT DISTINCT store_code
        FROM inventory_smart.latest_inventory
        WHERE store_code NOT IN ('90790','90796')
          AND oh > 0
    ) s;

    SELECT COUNT(*) INTO _total_stores FROM tmp_store_codes;
    RAISE NOTICE 'Total distinct stores to process: %', _total_stores;

    -- Step 2: Loop over store batches
    WHILE _batch_start <= _total_stores LOOP
        _batch_end := LEAST(_batch_start + batch_size - 1, _total_stores);

        RAISE NOTICE 'Processing stores % to % ...', _batch_start, _batch_end;

        INSERT INTO inventory_smart.product_profile_mapping (
            pp_code,
            mapping_code,
            l0_name,
            size_level_proportion,
            overall_proportion,
            product_code,
            store_code
        )
        SELECT DISTINCT ON (ppm.pp_code, paf.product_code, li.store_code)
            ppm.pp_code,
            NULL AS mapping_code,
            paf.l0_name,
            1 AS size_level_proportion,
            1 AS overall_proportion,
            paf.product_code,
            li.store_code
        FROM global.product_attributes_filter paf
        JOIN inventory_smart.ph_master ph
            ON paf.article = ph.article
        JOIN inventory_smart.product_profile_master ppm
            ON ph.ph_code = ppm.ph_code
        JOIN (
            SELECT li.product_code, li.store_code
            FROM inventory_smart.latest_inventory li
            JOIN (
                SELECT store_code
                FROM tmp_store_codes
                WHERE rn BETWEEN _batch_start AND _batch_end
            ) s USING (store_code)
            WHERE li.oh > 0
        ) li ON paf.product_code = li.product_code
        LEFT JOIN inventory_smart.product_profile_mapping pm
          ON pm.pp_code = ppm.pp_code
         AND pm.product_code = paf.product_code
         AND pm.store_code = li.store_code
        WHERE paf.active
          AND pm.pp_code IS NULL;   -- skip if already exists

        GET DIAGNOSTICS _inserted = ROW_COUNT;
        RAISE NOTICE '✔ Batch %–% complete → % new unique rows inserted.', _batch_start, _batch_end, _inserted;

        _batch_start := _batch_end + 1;
    END LOOP;

    RAISE NOTICE '✅ Completed full sync for product_profile_mapping. % stores processed.', _total_stores;
END;
$procedure$
;