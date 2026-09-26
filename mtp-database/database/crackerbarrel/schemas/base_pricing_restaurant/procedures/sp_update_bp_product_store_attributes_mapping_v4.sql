--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:sp_update_bp_store_attributes_mapping_3 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for sp_update_bp_store_attributes_mapping_3

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_update_bp_product_store_attributes_mapping_v4;

CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_update_bp_product_store_attributes_mapping_v4()
 LANGUAGE plpgsql
AS $procedure$
DECLARE
    _upsert_sql text;
    _diff_clause text;
    p_k text;
    tn text;
    _non_preserved_attributes text[];

    _cols text;
    _select text;
    _upsert_set_clause text;

    _start_time timestamp;
    _end_time timestamp;
    _delete_start_time timestamp;
    _upsert_start_time timestamp;

    _chunk_size integer := 250;
    _worker text;
BEGIN
    -- Procedure start
    _start_time := clock_timestamp();
    RAISE NOTICE 'Procedure started at %', clock_timestamp();

    -- Fetch non-preserved attributes
    SELECT array_agg(database_column)
    INTO _non_preserved_attributes
    FROM base_pricing_restaurant.bp_product_store_attributes_metadata
    WHERE database_column IS NOT NULL
      AND is_value_preserved = false;

    RAISE NOTICE 'Found % non-preserved attributes at %',
        COALESCE(array_length(_non_preserved_attributes, 1), 0),
        clock_timestamp();

    -- Delete ineligible combinations
    _delete_start_time := clock_timestamp();
    RAISE NOTICE 'Delete started at %', clock_timestamp();

     SELECT async_query INTO _worker FROM public.async_query('DROP TABLE IF EXISTS temp_ineligible_products,temp_ineligible_stores, temp_ineligible_segments;');
     PERFORM public.async_query_status(_worker, 'drop tmp table');  
           
    SELECT async_query INTO _worker FROM public.async_query('
    CREATE UNLOGGED TABLE temp_ineligible_products AS
    SELECT DISTINCT product_id
    FROM base_pricing_restaurant.bp_ineligible_products
	WHERE updated_at::date = CURRENT_DATE;');
    PERFORM public.async_query_status(_worker, 'drop tmp table'); 


    SELECT async_query INTO _worker FROM public.async_query('
    CREATE UNLOGGED TABLE temp_ineligible_stores AS
    SELECT DISTINCT store_id
    FROM base_pricing_restaurant.bp_ineligible_stores
	WHERE updated_at::date = CURRENT_DATE;');
    PERFORM public.async_query_status(_worker, 'drop tmp table'); 


    SELECT async_query INTO _worker FROM public.async_query('
    CREATE UNLOGGED TABLE temp_ineligible_segments AS
    SELECT DISTINCT segment_id
    FROM base_pricing_restaurant.bp_ineligible_segments
	WHERE updated_at::date = CURRENT_DATE;');
    PERFORM public.async_query_status(_worker, 'drop tmp table'); 

    RAISE NOTICE 'Unlogged tables created at %', clock_timestamp();

    IF EXISTS (SELECT 1 FROM temp_ineligible_products) THEN
    SELECT async_query INTO _worker FROM public.async_query('
        DELETE FROM base_pricing_restaurant.bp_product_store_attributes_mapping_v4 v4
        USING temp_ineligible_products p
        WHERE v4.product_id = p.product_id;');
     PERFORM public.async_query_status(_worker, 'drop tmp table'); 

        RAISE NOTICE 'Deleted ineligible products at %', clock_timestamp();
	ELSE
		RAISE NOTICE 'No ineligible products found – skipping product delete';
    END IF;

    IF EXISTS (SELECT 1 FROM temp_ineligible_stores) THEN
       SELECT async_query INTO _worker FROM public.async_query('
        DELETE FROM base_pricing_restaurant.bp_product_store_attributes_mapping_v4 v4
        USING temp_ineligible_stores s
        WHERE v4.store_id = s.store_id;');
        PERFORM public.async_query_status(_worker, 'drop tmp table'); 

        RAISE NOTICE 'Deleted ineligible stores at %', clock_timestamp();
	ELSE
		RAISE NOTICE 'No ineligible stores found – skipping store delete';
    END IF;

    IF EXISTS (SELECT 1 FROM temp_ineligible_segments) THEN
        SELECT async_query INTO _worker FROM public.async_query('
        DELETE FROM base_pricing_restaurant.bp_product_store_attributes_mapping_v4 v4
        USING temp_ineligible_segments g
        WHERE v4.segment_id = g.segment_id;');
        PERFORM public.async_query_status(_worker, 'drop tmp table'); 

        RAISE NOTICE 'Deleted ineligible segments at %', clock_timestamp();
	ELSE
		RAISE NOTICE 'No ineligible segments found – skipping segments delete';
    END IF;

    RAISE NOTICE 'Delete completed in % seconds at %',
        EXTRACT(EPOCH FROM (clock_timestamp() - _delete_start_time)),
        clock_timestamp();

    -- Get primary key for parallel processing
    SELECT
        tc.constraint_name,
        tc.table_schema || '.' || tc.table_name
    INTO p_k, tn
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_type = 'PRIMARY KEY'
      AND tc.table_name = 'bp_product_store_mapping'
      AND tc.table_schema = 'base_pricing_restaurant';

    RAISE NOTICE 'Primary key: %, Table: %', p_k, tn;

    -- UPSERT (INSERT + UPDATE combined)
    SELECT
        string_agg(database_column, ', ' ORDER BY attribute_id),
        string_agg(
            CASE
                WHEN attribute_name = 'total_inventory'
                    THEN 'blsig.total_inventory AS ' || database_column
                WHEN attribute_name = 'zone_exception'
                    THEN 'false AS ' || database_column
                ELSE 'bpsm.' || attribute_name || ' AS ' || database_column
            END,
            ', ' ORDER BY attribute_id
        )
    INTO _cols, _select
    FROM base_pricing_restaurant.bp_product_store_attributes_metadata
    WHERE database_column IS NOT NULL;

    -- Build SET clause for UPSERT (uses EXCLUDED)
    SELECT string_agg(
        format('%I = EXCLUDED.%I', c, c),
        ', '
    )
    INTO _upsert_set_clause
    FROM unnest(_non_preserved_attributes) c;

    -- Build diff clause for UPSERT (compares with EXCLUDED)
    SELECT string_agg(
        format('base_pricing_restaurant.bp_product_store_attributes_mapping_v4.%I IS DISTINCT FROM EXCLUDED.%I', c, c),
        ' OR '
    )
    INTO _diff_clause
    FROM unnest(_non_preserved_attributes) c;

    _upsert_sql := format($f$
        WITH rows AS (
            INSERT INTO base_pricing_restaurant.bp_product_store_attributes_mapping_v4
            (
                product_id,
                store_id,
                segment_id,
                channel_id,
                zone_structure,
                price_zone,
                effective_price_zone,
                created_at,
                updated_at,
                %s
            )
            SELECT
                bpsm.product_id,
                bpsm.store_id,
                bpsm.segment_id,
                bpsm.channel_id,
                NULL,
                NULL,
                NULL,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP,
                %s
            FROM (SELECT * FROM base_pricing_restaurant.bp_product_store_mapping {where}) bpsm
            JOIN base_pricing_restaurant.bp_product_master bpm
                ON bpm.product_id = bpsm.product_id
            JOIN base_pricing_restaurant.bp_store_master bsm
                ON bsm.store_id = bpsm.store_id
            JOIN base_pricing_restaurant.bp_customer_segment_master bcsm
                ON bcsm.segment_id = bpsm.segment_id
            LEFT JOIN base_pricing_restaurant.bp_latest_inventory_agg blsig
                ON blsig.product_id = bpsm.product_id
               AND blsig.store_id = bpsm.store_id
            WHERE bpm.usable
              AND bsm.active
              AND bcsm.is_active
            
            ON CONFLICT (product_id, store_id, segment_id)
            DO UPDATE SET
                %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE (%s)
            
            RETURNING 1
        )
        SELECT count(1) FROM rows;
    $f$, _cols, _select, _upsert_set_clause, _diff_clause);

    _upsert_start_time := clock_timestamp();
    RAISE NOTICE 'UPSERT (Insert/Update) started at %', clock_timestamp();

    PERFORM public.parellel_insert(
        _upsert_sql,
        25,
        tn,
        'product_id',
        p_k,
        _chunk_size
    );

    RAISE NOTICE 'UPSERT completed in % seconds',
        EXTRACT(EPOCH FROM (clock_timestamp() - _upsert_start_time));

   
    
    RAISE NOTICE 'Cleanup completed at %', clock_timestamp();
    
    -- Procedure end
    _end_time := clock_timestamp();
    RAISE NOTICE 'Procedure completed in % seconds at %',
        EXTRACT(EPOCH FROM (_end_time - _start_time)),
        clock_timestamp();
END;
$procedure$
;
