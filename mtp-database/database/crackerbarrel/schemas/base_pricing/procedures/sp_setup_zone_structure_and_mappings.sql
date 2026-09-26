--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:sp_setup_zone_structure_and_mappings_1 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.sp_setup_zone_structure_and_mappings_1

DROP PROCEDURE IF EXISTS base_pricing.sp_setup_zone_structure_and_mappings();

CREATE OR REPLACE PROCEDURE base_pricing.sp_setup_zone_structure_and_mappings()
 LANGUAGE plpgsql
AS $procedure$
DECLARE
    v_step_start TIMESTAMP;
    v_rows BIGINT;
    _update_sql TEXT;
    _worker TEXT;
    tn TEXT;
BEGIN
    RAISE NOTICE 'Starting zone structure setup and mappings at %', clock_timestamp();

    -- 1) Upsert zone structure (keep serial)
    INSERT INTO base_pricing.bp_zone_structure (
        zone_structure_id,
        structure_name,
        active,
        input_type
    )
    SELECT
        110,
        am.attribute_name,
        TRUE,
        COALESCE(am.input_type, 'text')
    FROM base_pricing.bp_store_attributes_metadata am
    WHERE am.attribute_id = 110
    ON CONFLICT (zone_structure_id)
    DO UPDATE SET
        structure_name = EXCLUDED.structure_name,
        active         = EXCLUDED.active,
        input_type     = EXCLUDED.input_type;

    -- 2) Insert zones (keep serial; zone_id uses MAX + row_number)
    WITH distinct_zones AS (
        SELECT DISTINCT UPPER(TRIM(price_zone)) AS zone_name
        FROM base_pricing.bp_store_master
		where active = true
    ),
    existing_zones AS (
        SELECT zone_name, zone_id
        FROM base_pricing.bp_zones
        WHERE zone_structure_id = 110
    ),
    new_zones AS (
        SELECT dz.zone_name
        FROM distinct_zones dz
        LEFT JOIN existing_zones ez ON dz.zone_name = ez.zone_name
        WHERE ez.zone_id IS NULL
    ),
    max_zone_id AS (
        SELECT COALESCE(MAX(zone_id), 1070) AS max_id
        FROM base_pricing.bp_zones
    ),
    numbered_new_zones AS (
        SELECT
            nz.zone_name,
            ROW_NUMBER() OVER (ORDER BY nz.zone_name) + m.max_id AS zone_id
        FROM new_zones nz
        CROSS JOIN max_zone_id m
    )
    INSERT INTO base_pricing.bp_zones (
        zone_id,
        zone_name,
        zone_structure_id,
        active
    )
    SELECT
        nzn.zone_id,
        nzn.zone_name,
        110,
        TRUE
    FROM numbered_new_zones nzn
    ON CONFLICT (zone_name, zone_structure_id) DO NOTHING;

    -- 3) Existing call to add data in table bp_product_customer_segment_prices
    CALL base_pricing.sp_create_product_segment_zone_structure();

    -- 4) PARALLEL: Update bp_product_customer_segment_prices.zone_structure_id
    v_step_start := clock_timestamp();

    SELECT async_query INTO _worker FROM public.async_query('DROP TABLE IF EXISTS public.temp_pcs_needing_zsid CASCADE;');
    PERFORM public.async_query_status(_worker, 'cleanup');

    SELECT async_query INTO _worker FROM public.async_query($sql$
        CREATE UNLOGGED TABLE public.temp_pcs_needing_zsid AS
        SELECT product_id, segment_id
        FROM base_pricing.bp_product_customer_segment_prices
        WHERE zone_structure_id IS NULL;
    $sql$);
    PERFORM public.async_query_status(_worker, 'cleanup');

    SELECT async_query INTO _worker FROM public.async_query(
        'CREATE INDEX idx_temp_pcs_needing_zsid ON public.temp_pcs_needing_zsid(product_id, segment_id);'
    );
    PERFORM public.async_query_status(_worker, 'cleanup');

    SELECT async_query INTO _worker FROM public.async_query('ANALYZE public.temp_pcs_needing_zsid;');
    PERFORM public.async_query_status(_worker, 'cleanup');

    EXECUTE 'SELECT COUNT(*) FROM public.temp_pcs_needing_zsid' INTO v_rows;

    IF v_rows > 0 THEN
        tn := 'public.temp_pcs_needing_zsid';

        _update_sql := $sql$
            WITH updated_rows AS (
                UPDATE base_pricing.bp_product_customer_segment_prices pcs
                SET zone_structure_id = 110
                FROM (SELECT * FROM public.temp_pcs_needing_zsid {where}) t
                WHERE pcs.product_id = t.product_id
                  AND pcs.segment_id = t.segment_id
                  AND pcs.zone_structure_id IS NULL
                RETURNING 1
            )
            SELECT count(1) FROM updated_rows;
        $sql$;

        PERFORM public.parellel_insert(
            _update_sql,
            25,
            tn,
            'product_id',
            NULL,
            500
        );
    END IF;

    DROP TABLE IF EXISTS public.temp_pcs_needing_zsid;

    RAISE NOTICE 'PCS zone_structure_id updated in % seconds',
        EXTRACT(EPOCH FROM (clock_timestamp() - v_step_start));

    -- 5) PARALLEL: Update mapping_v4.price_zone from store_master (only diffs)
    
    v_step_start := clock_timestamp();

    SELECT async_query INTO _worker FROM public.async_query('DROP TABLE IF EXISTS public.temp_v4_price_zone_updates CASCADE;');
    PERFORM public.async_query_status(_worker, 'cleanup');

    SELECT async_query INTO _worker FROM public.async_query($sql$
        CREATE UNLOGGED TABLE public.temp_v4_price_zone_updates AS
        SELECT
            v4.product_id,
            v4.store_id,
            v4.segment_id,
            sm.price_zone
        FROM base_pricing.bp_product_store_attributes_mapping_v4 v4
        JOIN base_pricing.bp_store_master sm
          ON v4.store_id = sm.store_id
        WHERE v4.price_zone IS DISTINCT FROM sm.price_zone;
    $sql$);
    PERFORM public.async_query_status(_worker, 'cleanup');

    SELECT async_query INTO _worker FROM public.async_query(
        'CREATE INDEX idx_temp_v4_price_zone_updates ON public.temp_v4_price_zone_updates(store_id, product_id, segment_id);'
    );
    PERFORM public.async_query_status(_worker, 'cleanup');

    SELECT async_query INTO _worker FROM public.async_query('ANALYZE public.temp_v4_price_zone_updates;');
    PERFORM public.async_query_status(_worker, 'cleanup');

    EXECUTE 'SELECT COUNT(*) FROM public.temp_v4_price_zone_updates' INTO v_rows;

    IF v_rows > 0 THEN
        tn := 'public.temp_v4_price_zone_updates';

        _update_sql := $sql$
            WITH updated_rows AS (
                UPDATE base_pricing.bp_product_store_attributes_mapping_v4 v4
                SET price_zone = t.price_zone
                FROM (SELECT * FROM public.temp_v4_price_zone_updates {where}) t
                WHERE v4.product_id = t.product_id
                  AND v4.store_id   = t.store_id
                  AND v4.segment_id = t.segment_id
                  AND v4.price_zone IS DISTINCT FROM t.price_zone
                RETURNING 1
            )
            SELECT count(1) FROM updated_rows;
        $sql$;

        PERFORM public.parellel_insert(
            _update_sql,
            25,
            tn,
            'product_id',   
            NULL,
            500
        );
    END IF;

--    DROP TABLE IF EXISTS public.temp_v4_price_zone_updates;

    RAISE NOTICE 'Mapping_v4 price_zone updated in % seconds',
        EXTRACT(EPOCH FROM (clock_timestamp() - v_step_start));

    -- 6) Update effective_price_zone (only diffs)

    v_step_start := clock_timestamp();

--    UPDATE base_pricing.bp_product_store_attributes_mapping_v4
--    SET effective_price_zone = channel_id::text || ' | ' || price_zone;

	IF v_rows > 0 THEN
        tn := 'public.temp_v4_price_zone_updates';

        _update_sql := $sql$
            WITH updated_rows AS (
                UPDATE base_pricing.bp_product_store_attributes_mapping_v4 v4
                --SET effective_price_zone = v4.channel_id::text || ' | ' || v4.price_zone
                SET effective_price_zone = CASE WHEN v4.price_zone IS NULL OR v4.price_zone = '' THEN NULL ELSE v4.channel_id::text || ' | ' || v4.price_zone END
                FROM (SELECT * FROM public.temp_v4_price_zone_updates {where}) t
                WHERE v4.product_id = t.product_id
                  AND v4.store_id   = t.store_id
                  AND v4.segment_id = t.segment_id
                RETURNING 1
            )
            SELECT count(1) FROM updated_rows;
        $sql$;

        PERFORM public.parellel_insert(
            _update_sql,
            25,
            tn,
            'product_id',   
            NULL,
            500
        );
    END IF;

    RAISE NOTICE 'Mapping_v4 effective_price_zone updated in % seconds',
        EXTRACT(EPOCH FROM (clock_timestamp() - v_step_start));

    -- 7) PARALLEL: Update zone_structure = 'Zone' (only diffs)
    v_step_start := clock_timestamp();


    IF v_rows > 0 THEN
        tn := 'public.temp_v4_price_zone_updates';

        _update_sql := $sql$
            WITH updated_rows AS (
                UPDATE base_pricing.bp_product_store_attributes_mapping_v4 v4
                SET zone_structure = 'Zone'
                FROM (SELECT * FROM public.temp_v4_price_zone_updates {where}) t
                WHERE v4.product_id = t.product_id
                  AND v4.store_id   = t.store_id
                  AND v4.segment_id = t.segment_id
                RETURNING 1
            )
            SELECT count(1) FROM updated_rows;
        $sql$;

        PERFORM public.parellel_insert(
            _update_sql,
            25,
            tn,
            'product_id',
            NULL,
            500
        );
    END IF;

    DROP TABLE IF EXISTS public.temp_v4_price_zone_updates;

    RAISE NOTICE 'Mapping_v4 zone_structure updated in % seconds',
        EXTRACT(EPOCH FROM (clock_timestamp() - v_step_start));

    -- 8) PARALLEL: Insert/Upsert store-zone mappings
    v_step_start := clock_timestamp();

     INSERT INTO base_pricing.bp_store_zone_mapping (
        store_id,
        zone_id,
        zone_structure_id
    )
    SELECT 
        sm.store_id,
        z.zone_id,
        110 as zone_structure_id
    FROM base_pricing.bp_store_master sm
    INNER JOIN base_pricing.bp_zones z 
        ON UPPER(TRIM(sm.price_zone)) = z.zone_name
        AND z.zone_structure_id = 110
    WHERE z.zone_id IS NOT NULL and sm.active = true
    ON CONFLICT (store_id, zone_structure_id) 
    DO UPDATE SET 
        zone_id = EXCLUDED.zone_id
    WHERE base_pricing.bp_store_zone_mapping.zone_id IS DISTINCT FROM EXCLUDED.zone_id;

    RAISE NOTICE 'Store_zone_mapping upsert done in % seconds',
        EXTRACT(EPOCH FROM (clock_timestamp() - v_step_start));

    -- Completion
    RAISE NOTICE 'Zone structure setup and mappings completed successfully at %', clock_timestamp();

EXCEPTION
    WHEN OTHERS THEN
        DROP TABLE IF EXISTS public.temp_pcs_needing_zsid;
        DROP TABLE IF EXISTS public.temp_v4_price_zone_updates;
        RAISE EXCEPTION 'Error in sp_setup_zone_structure_and_mappings: %', SQLERRM;
END;
$procedure$
;
