
--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:sp_insert_zone_structure_and_mapping_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial_function_create for sp_insert_zone_structure_and_mapping_v1


DROP PROCEDURE IF EXISTS base_pricing.sp_insert_zone_structure_and_mapping();

CREATE OR REPLACE PROCEDURE base_pricing.sp_insert_zone_structure_and_mapping()
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
DECLARE
    v_zone_structure_id bigint;
    v_zone_id bigint;
    v_store_id bigint;
BEGIN
    -- Insert into bp_zone_structure
    INSERT INTO base_pricing.bp_zone_structure (
        zone_structure_id,
        structure_name,
        active,
        input_type
    )
    VALUES (
        nextval('base_pricing.bp_zone_structure_zone_structure_id_seq'::regclass),
        'No Zone Structure',
        TRUE,
        'text'
    )
    RETURNING zone_structure_id INTO v_zone_structure_id;

    -- Insert into bp_zones
    INSERT INTO base_pricing.bp_zones (
        zone_id,
        zone_name,
        zone_structure_id,
        active
    )
    VALUES (
        nextval('base_pricing.bp_zones_zone_id_seq'::regclass),
        '',
        v_zone_structure_id,
        TRUE
    )
    RETURNING zone_id INTO v_zone_id;

    -- Get first store_id from store_master
    SELECT store_id
    INTO v_store_id
    FROM base_pricing.bp_store_master
    ORDER BY store_id
    LIMIT 1;

    -- Insert into bp_store_zone_mapping
    INSERT INTO base_pricing.bp_store_zone_mapping (
        mapping_id,
        store_id,
        zone_id,
        zone_structure_id
    )
    VALUES (
        nextval('base_pricing.bp_store_zone_mapping_mapping_id_seq'::regclass),
        v_store_id,
        v_zone_id,
        v_zone_structure_id
    );

    -- Optional: display inserted IDs
    RAISE NOTICE 'Inserted zone_structure_id: %, zone_id: %, store_id: %',
        v_zone_structure_id, v_zone_id, v_store_id;

END;
$procedure$;
