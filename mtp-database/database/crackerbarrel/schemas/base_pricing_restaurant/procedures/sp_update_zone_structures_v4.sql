--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:sp_update_zone_structures_v4_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for sp_update_zone_structures_v4_2

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_update_zone_structures_v4;

CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_update_zone_structures_v4()
 LANGUAGE plpgsql
AS $procedure$
DECLARE
    v_step_start TIMESTAMP;
    v_rows_updated BIGINT;
    _update_sql TEXT;
    _worker TEXT;
    p_k TEXT;
    tn TEXT;
BEGIN
    RAISE NOTICE 'Starting zone mapping updates at %', clock_timestamp();

    --STEP 1: Update zone_structure (PARALLELIZED)
    v_step_start := clock_timestamp();

    -- Drop temp table using async_query
    SELECT async_query INTO _worker FROM public.async_query('DROP TABLE IF EXISTS public.temp_zone_structures CASCADE;');
    PERFORM public.async_query_status(_worker, 'cleanup');

    -- Create temp table using async_query
    SELECT async_query INTO _worker FROM public.async_query($sql$
        CREATE UNLOGGED TABLE public.temp_zone_structures AS
        SELECT
            psa.product_id,
            psa.store_id,
            psa.segment_id,
            zs.structure_name AS zone_structure
        FROM base_pricing_restaurant.bp_product_store_attributes_mapping_v4 psa
        JOIN base_pricing_restaurant.bp_product_customer_segment_prices pcs
            ON psa.product_id = pcs.product_id
           AND psa.segment_id = pcs.segment_id
        JOIN base_pricing_restaurant.bp_zone_structure zs
            ON pcs.zone_structure_id = zs.zone_structure_id
        WHERE psa.zone_structure IS NULL
          AND zs.active = TRUE;
    $sql$);
    PERFORM public.async_query_status(_worker, 'cleanup');

    -- Create index using async_query
    SELECT async_query INTO _worker FROM public.async_query('CREATE INDEX idx_temp_zone_structures ON public.temp_zone_structures(product_id, store_id, segment_id);');
    PERFORM public.async_query_status(_worker, 'cleanup');

    -- Analyze temp table
    SELECT async_query INTO _worker FROM public.async_query('ANALYZE public.temp_zone_structures;');
    PERFORM public.async_query_status(_worker, 'cleanup');

    RAISE NOTICE 'temp_zone_structures created at %', clock_timestamp();

    -- Check if temp table has data
    EXECUTE 'SELECT COUNT(*) FROM public.temp_zone_structures' INTO v_rows_updated;

    raise notice 'rows count %',v_rows_updated;
    
    IF v_rows_updated = 0 THEN
        RAISE NOTICE 'No zone_structure updates needed, skipping price_zone and effective_price_zone';
        DROP TABLE IF EXISTS public.temp_zone_structures;
        RETURN;
    END IF;

    -- PARALLEL UPDATE for zone_structure
    tn := 'public.temp_zone_structures';

    _update_sql := $sql$
        WITH updated_rows AS (
            UPDATE base_pricing_restaurant.bp_product_store_attributes_mapping_v4 psa
            SET zone_structure = tzs.zone_structure
            FROM (SELECT * FROM public.temp_zone_structures {where}) tzs
            WHERE psa.product_id = tzs.product_id
              AND psa.store_id = tzs.store_id
              AND psa.segment_id = tzs.segment_id
              AND psa.zone_structure IS DISTINCT FROM tzs.zone_structure
            RETURNING 1
        )
        SELECT count(1) FROM updated_rows;
    $sql$;

    PERFORM public.parellel_insert(
        _update_sql,
        50,                    -- 50 workers
        tn,                    -- chunk by temp_zone_structures
        'product_id',
        NULL,                  -- no PK constraint needed
        500                    -- chunk size
    );

    RAISE NOTICE 'STEP 1: zone_structure updated in % seconds',
        EXTRACT(EPOCH FROM (clock_timestamp() - v_step_start));

    DROP TABLE IF EXISTS public.temp_zone_structures;

    --STEP 2A: Identify rows needing price_zone
    v_step_start := clock_timestamp();

    -- Drop and create temp table for rows needing price_zone
    SELECT async_query INTO _worker FROM public.async_query('DROP TABLE IF EXISTS public.temp_psa_needing_price_zone CASCADE;');
    PERFORM public.async_query_status(_worker, 'cleanup');

    SELECT async_query INTO _worker FROM public.async_query($sql$
        CREATE UNLOGGED TABLE public.temp_psa_needing_price_zone AS
        SELECT
            product_id,
            store_id,
            segment_id,
            zone_structure
        FROM base_pricing_restaurant.bp_product_store_attributes_mapping_v4
        WHERE price_zone IS NULL
          AND zone_structure IS NOT NULL;
    $sql$);
    PERFORM public.async_query_status(_worker, 'cleanup');

    SELECT async_query INTO _worker FROM public.async_query('CREATE INDEX idx_temp_psa_needing_price_zone ON public.temp_psa_needing_price_zone(product_id, store_id, segment_id);');
    PERFORM public.async_query_status(_worker, 'cleanup');

    EXECUTE 'SELECT COUNT(*) FROM public.temp_psa_needing_price_zone' INTO v_rows_updated;

    RAISE NOTICE 'STEP 2A: temp_psa_needing_price_zone created (% rows) at %',
        v_rows_updated, clock_timestamp();

    IF v_rows_updated = 0 THEN
        RAISE NOTICE 'No rows need price_zone update - skipping STEP 2 & 3';
        DROP TABLE IF EXISTS public.temp_psa_needing_price_zone;
        RETURN;
    END IF;

    --STEP 2B: Resolve price_zone
    SELECT async_query INTO _worker FROM public.async_query('DROP TABLE IF EXISTS public.temp_price_zones CASCADE;');
    PERFORM public.async_query_status(_worker, 'cleanup');

    SELECT async_query INTO _worker FROM public.async_query($sql$
        CREATE UNLOGGED TABLE public.temp_price_zones AS
        SELECT
            p.product_id,
            p.store_id,
            p.segment_id,
            z.zone_name AS price_zone
        FROM public.temp_psa_needing_price_zone p
        JOIN base_pricing_restaurant.bp_product_customer_segment_prices pcs
            ON p.product_id = pcs.product_id
           AND p.segment_id = pcs.segment_id
        JOIN base_pricing_restaurant.bp_store_zone_mapping szm
            ON pcs.zone_structure_id = szm.zone_structure_id
           AND p.store_id = szm.store_id
        JOIN base_pricing_restaurant.bp_zones z
            ON szm.zone_id = z.zone_id
           AND szm.zone_structure_id = z.zone_structure_id
        WHERE z.active = TRUE;
    $sql$);
    PERFORM public.async_query_status(_worker, 'cleanup');

    SELECT async_query INTO _worker FROM public.async_query('CREATE INDEX idx_temp_price_zones ON public.temp_price_zones(product_id, store_id, segment_id);');
    PERFORM public.async_query_status(_worker, 'cleanup');

    SELECT async_query INTO _worker FROM public.async_query('ANALYZE public.temp_price_zones;');
    PERFORM public.async_query_status(_worker, 'cleanup');

    RAISE NOTICE 'STEP 2B: temp_price_zones created at %', clock_timestamp();

    -- PARALLEL UPDATE for price_zone
    tn := 'public.temp_price_zones';

    _update_sql := $sql$
        WITH updated_rows AS (
            UPDATE base_pricing_restaurant.bp_product_store_attributes_mapping_v4 psa
            SET price_zone = tpz.price_zone
            FROM (SELECT * FROM public.temp_price_zones {where}) tpz
            WHERE psa.product_id = tpz.product_id
              AND psa.store_id = tpz.store_id
              AND psa.segment_id = tpz.segment_id
              AND psa.price_zone IS DISTINCT FROM tpz.price_zone
            RETURNING 1
        )
        SELECT count(1) FROM updated_rows;
    $sql$;

    PERFORM public.parellel_insert(
        _update_sql,
        50,
        tn,
        'product_id',
        NULL,
        500
    );

    RAISE NOTICE 'STEP 2: price_zone updated in % seconds',
        EXTRACT(EPOCH FROM (clock_timestamp() - v_step_start));

    DROP TABLE IF EXISTS public.temp_psa_needing_price_zone;
    DROP TABLE IF EXISTS public.temp_price_zones;

    --STEP 3: effective_price_zone (targeted)
    v_step_start := clock_timestamp();

    -- Create temp table
    SELECT async_query INTO _worker FROM public.async_query('DROP TABLE IF EXISTS public.temp_psa_needing_effective_zone CASCADE;');
    PERFORM public.async_query_status(_worker, 'cleanup');

    SELECT async_query INTO _worker FROM public.async_query($sql$
        CREATE UNLOGGED TABLE public.temp_psa_needing_effective_zone AS
        SELECT
            product_id,
            store_id,
            segment_id,
            channel_id,
            price_zone
        FROM base_pricing_restaurant.bp_product_store_attributes_mapping_v4
        WHERE price_zone IS NOT NULL
          AND effective_price_zone IS NULL;
    $sql$);
    PERFORM public.async_query_status(_worker, 'cleanup');

    SELECT async_query INTO _worker FROM public.async_query('CREATE INDEX idx_temp_psa_needing_effective_zone ON public.temp_psa_needing_effective_zone(product_id, store_id, segment_id);');
    PERFORM public.async_query_status(_worker, 'cleanup');

    SELECT async_query INTO _worker FROM public.async_query('ANALYZE public.temp_psa_needing_effective_zone;');
    PERFORM public.async_query_status(_worker, 'cleanup');

    EXECUTE 'SELECT COUNT(*) FROM public.temp_psa_needing_effective_zone' INTO v_rows_updated;
    
    IF v_rows_updated = 0 THEN
        RAISE NOTICE 'No rows need effective_price_zone update - done';
        DROP TABLE IF EXISTS public.temp_psa_needing_effective_zone;
        RETURN;
    END IF;

    -- PARALLEL UPDATE for effective_price_zone
    tn := 'public.temp_psa_needing_effective_zone';

    _update_sql := $sql$
        WITH updated_rows AS (
            UPDATE base_pricing_restaurant.bp_product_store_attributes_mapping_v4 psa
            SET effective_price_zone = t.channel_id::text || ' | ' || t.price_zone
            FROM (SELECT * FROM public.temp_psa_needing_effective_zone {where}) t
            WHERE psa.product_id = t.product_id
              AND psa.store_id = t.store_id
              AND psa.segment_id = t.segment_id
              AND psa.effective_price_zone IS DISTINCT FROM (t.channel_id::text || ' | ' || t.price_zone)
            RETURNING 1
        )
        SELECT count(1) FROM updated_rows;
    $sql$;

    PERFORM public.parellel_insert(
        _update_sql,
        50,
        tn,
        'product_id',
        NULL,
        500
    );

    RAISE NOTICE 'STEP 3: effective_price_zone updated in % seconds',
        EXTRACT(EPOCH FROM (clock_timestamp() - v_step_start));

    DROP TABLE IF EXISTS public.temp_psa_needing_effective_zone;

    RAISE NOTICE 'Zone structure processing completed successfully at %',
        clock_timestamp();

EXCEPTION
    WHEN OTHERS THEN
        DROP TABLE IF EXISTS public.temp_zone_structures;
        DROP TABLE IF EXISTS public.temp_psa_needing_price_zone;
        DROP TABLE IF EXISTS public.temp_price_zones;
        DROP TABLE IF EXISTS public.temp_psa_needing_effective_zone;
        RAISE EXCEPTION 'Error in sp_update_zone_structures_v4: %', SQLERRM;
END;
$procedure$
;
