--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:fn_update_zone_structure_and_zone_10 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.fn_update_zone_structure_and_zone_10

DROP FUNCTION IF EXISTS base_pricing.fn_update_zone_structure_and_zone;

CREATE OR REPLACE FUNCTION base_pricing.fn_update_zone_structure_and_zone(p_hierarchy_condition text, p_segment_ids integer[], p_batch_size integer DEFAULT 50000)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_updated_count INTEGER := 0;
    v_rows_affected INTEGER := 0;
    v_sql TEXT;
BEGIN
    -- Create temp table for product filter
    v_sql := format(
        $f$
        CREATE TEMP TABLE tmp_product_filter ON COMMIT DROP AS
        SELECT DISTINCT p.product_id
        FROM base_pricing.bp_product_master p
        WHERE %s
        $f$,
        p_hierarchy_condition
    );
    EXECUTE v_sql;

    -- Fill tmp_to_update with all rows to update
    CREATE TEMP TABLE tmp_to_update ON COMMIT DROP AS
    WITH
        product_segment_zones AS (
            SELECT
                pc.product_id,
                pc.segment_id,
                pc.zone_structure_id
            FROM base_pricing.bp_product_customer_segment_prices pc
            JOIN tmp_product_filter pf
                ON pc.product_id = pf.product_id
            WHERE pc.segment_id = ANY(p_segment_ids)
        ),
        store_zone_mappings AS (
            SELECT
                szm.store_id,
                szm.zone_id,
                szm.zone_structure_id,
                z.zone_name,
                zs.structure_name AS zone_structure_name,
                sm.s0_cid AS channel_id
            FROM base_pricing.bp_store_zone_mapping szm
            JOIN base_pricing.bp_zones z
                ON szm.zone_id = z.zone_id
            JOIN base_pricing.bp_zone_structure zs
                ON szm.zone_structure_id = zs.zone_structure_id
            JOIN base_pricing.bp_store_master sm
                ON szm.store_id = sm.store_id
            WHERE szm.zone_structure_id IN (
                SELECT DISTINCT zone_structure_id FROM product_segment_zones
            )
        )
    SELECT
        t.product_id,
        t.store_id,
        t.segment_id,
        szm.zone_structure_name,
        szm.zone_name,
        szm.channel_id || ' | ' || szm.zone_name AS effective_price_zone
    FROM base_pricing.bp_product_store_attributes_mapping t
    JOIN product_segment_zones psz
        ON t.product_id = psz.product_id
       AND t.segment_id = psz.segment_id
    JOIN store_zone_mappings szm
        ON t.store_id = szm.store_id
       AND psz.zone_structure_id = szm.zone_structure_id;

    -- Report how many rows we are going to update
    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    RAISE NOTICE 'Prepared % rows for update.', v_rows_affected;

    -- Loop to update in batches
    LOOP
        -- Update one batch
        UPDATE base_pricing.bp_product_store_attributes_mapping t
        SET
            zone_structure = u.zone_structure_name,
            price_zone = u.zone_name,
            effective_price_zone = u.effective_price_zone,
            updated_at = CURRENT_TIMESTAMP
        FROM (
            SELECT *
            FROM tmp_to_update
            LIMIT p_batch_size
        ) u
        WHERE
            t.product_id = u.product_id
            AND t.store_id = u.store_id
            AND t.segment_id = u.segment_id;

        GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
        v_updated_count := v_updated_count + v_rows_affected;

        -- Exit loop if no more rows
        IF v_rows_affected = 0 THEN
            EXIT;
        END IF;

        -- Delete processed rows
        DELETE FROM tmp_to_update
        USING (
            SELECT product_id, store_id, segment_id
            FROM tmp_to_update
            LIMIT p_batch_size
        ) d
        WHERE tmp_to_update.product_id = d.product_id
          AND tmp_to_update.store_id = d.store_id
          AND tmp_to_update.segment_id = d.segment_id;
    END LOOP;
    RETURN v_updated_count;
END;
$function$
;