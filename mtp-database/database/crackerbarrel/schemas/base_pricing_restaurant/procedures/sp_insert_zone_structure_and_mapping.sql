--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:sp_insert_zone_structure_and_mapping_1 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.sp_insert_zone_structure_and_mapping_1

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_insert_zone_structure_and_mapping;

CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_insert_zone_structure_and_mapping()
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
DECLARE
    v_zone_structure_id BIGINT;
    v_zone_id BIGINT;
BEGIN
    -- ==========================================================
    -- 1. Ensure "No Zone Structure" exists (insert if missing)
    -- ==========================================================
    SELECT zone_structure_id
    INTO v_zone_structure_id
    FROM base_pricing_restaurant.bp_zone_structure
    WHERE structure_name = 'No Zone Structure'
    LIMIT 1;

    IF v_zone_structure_id IS NULL THEN
        INSERT INTO base_pricing_restaurant.bp_zone_structure (
            zone_structure_id, structure_name, active, input_type
        )
        VALUES (
            nextval('base_pricing_restaurant.bp_zone_structure_zone_structure_id_seq'::regclass),
            'No Zone Structure',
            TRUE,
            'text'
        )
        RETURNING zone_structure_id INTO v_zone_structure_id;

        RAISE NOTICE 'Inserted new zone_structure_id: %', v_zone_structure_id;
    ELSE
        RAISE NOTICE 'Using existing zone_structure_id: %', v_zone_structure_id;
    END IF;

    -- ==========================================================
    -- 2. Ensure empty zone exists for that structure
    -- ==========================================================
    SELECT zone_id
    INTO v_zone_id
    FROM base_pricing_restaurant.bp_zones
    WHERE zone_structure_id = v_zone_structure_id
      AND zone_name = ''
    LIMIT 1;

    IF v_zone_id IS NULL THEN
        INSERT INTO base_pricing_restaurant.bp_zones (
            zone_id, zone_name, zone_structure_id, active
        )
        VALUES (
            nextval('base_pricing_restaurant.bp_zones_zone_id_seq'::regclass),
            '',
            v_zone_structure_id,
            TRUE
        )
        RETURNING zone_id INTO v_zone_id;

        RAISE NOTICE 'Inserted new zone_id: %', v_zone_id;
    ELSE
        RAISE NOTICE 'Using existing zone_id: %', v_zone_id;
    END IF;

    -- ==========================================================
    -- 3. Bulk UPSERT for all stores in store_master
    -- ==========================================================
    INSERT INTO base_pricing_restaurant.bp_store_zone_mapping (
        mapping_id,
        store_id,
        zone_id,
        zone_structure_id
    )
    SELECT
        nextval('base_pricing_restaurant.bp_store_zone_mapping_mapping_id_seq'::regclass),
        sm.store_id,
        v_zone_id,
        v_zone_structure_id
    FROM base_pricing_restaurant.bp_store_master sm
    ON CONFLICT (store_id, zone_structure_id)
    DO UPDATE SET zone_id = EXCLUDED.zone_id;

    RAISE NOTICE 'Zone structure and mappings successfully ensured.';

END;
$procedure$;