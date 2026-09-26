--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:fn_update_product_store_zone_attributes_v2_10 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.fn_update_product_store_zone_attributes_v2_10

DROP FUNCTION IF EXISTS base_pricing.fn_update_product_store_zone_attributes_v2;

CREATE OR REPLACE FUNCTION base_pricing.fn_update_product_store_zone_attributes_v2(zone_mappings jsonb, channel_hierarchy_id integer, batch_size integer DEFAULT 1000)
 RETURNS TABLE(product_id bigint, segment_id integer, updated boolean, message text)
 LANGUAGE plpgsql
AS $function$
DECLARE
    update_count INTEGER := 0;
    v_rows_affected INTEGER := 0;
    v_batch_counter INTEGER := 0;
    v_channel_column TEXT;
    v_sql TEXT;
	rec RECORD;
BEGIN
    -- Construct the dynamic column name
    v_channel_column := format('s%s_cid', channel_hierarchy_id);
    
    -- Validate that the column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'base_pricing' 
        AND table_name = 'bp_store_master' 
        AND column_name = v_channel_column
    ) THEN
        RAISE EXCEPTION 'Column % does not exist in base_pricing.bp_store_master', v_channel_column;
    END IF;

    -- Create temporary table to store results
    CREATE TEMP TABLE IF NOT EXISTS update_results (
        result_product_id BIGINT,
        result_segment_id INTEGER,
        result_updated BOOLEAN,
        result_message TEXT
    ) ON COMMIT DROP;

    -- Create temp table for input data
    CREATE TEMP TABLE tmp_input_data ON COMMIT DROP AS
    SELECT 
        (x->>'product_id')::bigint as input_product_id,
        (x->>'customer_segment_id')::integer as input_segment_id,
        (x->>'zone_structure_id')::integer as input_zone_structure_id
    FROM jsonb_array_elements(zone_mappings) x;
    
    CREATE INDEX idx_tmp_input ON tmp_input_data (input_product_id, input_segment_id);

    -- Use dynamic SQL to build the query with the correct column
    v_sql := format('
        CREATE TEMP TABLE tmp_zone_data ON COMMIT DROP AS
        WITH store_zone_mappings AS (
            SELECT
                szm.store_id,
                szm.zone_id,
                szm.zone_structure_id,
                z.zone_name,
                zs.structure_name AS zone_structure_name,
                sm.%I AS channel_id
            FROM base_pricing.bp_store_zone_mapping szm
            JOIN base_pricing.bp_zones z
                ON szm.zone_id = z.zone_id
            JOIN base_pricing.bp_zone_structure zs
                ON szm.zone_structure_id = zs.zone_structure_id
            JOIN base_pricing.bp_store_master sm
                ON szm.store_id = sm.store_id
            WHERE szm.zone_structure_id IN (
                SELECT DISTINCT input_zone_structure_id FROM tmp_input_data
            )
        )
        SELECT DISTINCT 
            t.input_product_id as zone_product_id,
            szm.store_id as zone_store_id,
            t.input_segment_id as zone_segment_id,
            szm.zone_structure_name,
            szm.zone_name,
            szm.channel_id || '' | '' || szm.zone_name AS effective_price_zone,
            t.input_zone_structure_id
        FROM tmp_input_data t
        JOIN base_pricing.bp_product_store_attributes_mapping_v4 psam
            ON psam.product_id = t.input_product_id 
           AND psam.segment_id = t.input_segment_id
        JOIN store_zone_mappings szm
            ON psam.store_id = szm.store_id
           AND t.input_zone_structure_id = szm.zone_structure_id
    ', v_channel_column);

    EXECUTE v_sql;
	

    CREATE INDEX idx_tmp_zone ON tmp_zone_data (zone_product_id, zone_segment_id);

    -- Process updates in batches
    WHILE EXISTS (SELECT 1 FROM tmp_zone_data LIMIT 1) LOOP
        -- Update one batch
        WITH batch_to_update AS (
            SELECT 
                b.zone_product_id,
                b.zone_store_id,
                b.zone_segment_id,
                b.zone_structure_name,
                b.zone_name,
                b.effective_price_zone
            FROM tmp_zone_data b
            LIMIT batch_size
            FOR UPDATE SKIP LOCKED
        )
        UPDATE base_pricing.bp_product_store_attributes_mapping_v4 t
        SET
            zone_structure = u.zone_structure_name,
            price_zone = u.zone_name,
            effective_price_zone = u.effective_price_zone,
            updated_at = CURRENT_TIMESTAMP
        FROM batch_to_update u
        WHERE t.product_id = u.zone_product_id
		  AND t.store_id = u.zone_store_id
          AND t.segment_id = u.zone_segment_id;

        GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
        update_count := update_count + v_rows_affected;
        v_batch_counter := v_batch_counter + 1;

        -- Insert results for this batch
        INSERT INTO update_results
        SELECT 
            u.batch_product_id,
            u.batch_segment_id,
            true,
            format('Updated zone structure to %s and effective price zone to %s', u.batch_zone_structure_name, u.effective_price_zone)
        FROM (
            SELECT 
                zone_product_id as batch_product_id,
                zone_segment_id as batch_segment_id,
                zone_structure_name as batch_zone_structure_name,
				effective_price_zone
            FROM tmp_zone_data
            LIMIT batch_size
        ) u;

        -- Efficient batch deletion
        DELETE FROM tmp_zone_data
        WHERE (zone_product_id, zone_segment_id, zone_store_id) IN (
            SELECT zone_product_id, zone_segment_id, zone_store_id
            FROM tmp_zone_data
            LIMIT batch_size
        );

        -- Commit progress periodically
        IF v_batch_counter % 10 = 0 THEN
            RAISE NOTICE 'Processed % batches, % records updated', v_batch_counter, update_count;
        END IF;
    END LOOP;

    -- Handle records that couldn't be processed
    INSERT INTO update_results
    SELECT 
        t.input_product_id,
        t.input_segment_id,
        false,
        CASE 
            WHEN NOT EXISTS (
                SELECT 1 FROM base_pricing.bp_product_store_attributes_mapping_v4 psam
                WHERE psam.product_id = t.input_product_id AND psam.segment_id = t.input_segment_id
            ) THEN 'No matching record found'
            WHEN NOT EXISTS (
                SELECT 1 FROM base_pricing.bp_zone_structure zs
                WHERE zs.zone_structure_id = t.input_zone_structure_id
            ) THEN format('Invalid zone_structure_id: %s', t.input_zone_structure_id)
            ELSE 'Unknown error'
        END
    FROM tmp_input_data t
    WHERE NOT EXISTS (
        SELECT 1 FROM update_results r 
        WHERE r.result_product_id = t.input_product_id AND r.result_segment_id = t.input_segment_id
    );

    RAISE NOTICE 'Completed: % records updated in % batches', update_count, v_batch_counter;
    
    RETURN QUERY 
        SELECT 
            result_product_id AS product_id,
            result_segment_id AS segment_id,
            result_updated AS updated,
            result_message AS message
        FROM update_results;
END;
$function$
;