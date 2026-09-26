--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:sp_insert_store_zone_mapping_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for sp_insert_store_zone_mapping_1

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_insert_store_zone_mapping;

CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_insert_store_zone_mapping()
 LANGUAGE plpgsql
AS $procedure$
DECLARE
    v_rows_inserted INT;
    v_zone_structures_count INT;
BEGIN
    RAISE NOTICE 'Store zone insertion...';
    
    SELECT COUNT(*) INTO v_zone_structures_count
    FROM base_pricing_restaurant.bp_zone_structure 
    WHERE active = TRUE;
    
    RAISE NOTICE 'Active zone structures: %', v_zone_structures_count;
    
    WITH active_zone_structures AS (
        SELECT structure_name, zone_structure_id
        FROM base_pricing_restaurant.bp_zone_structure 
        WHERE active = TRUE
    ),
    extracted_jsonb AS (
        SELECT 
            store_id,
            jsonb_array_elements(attributes)->>'attribute_name' as attribute_name,
            jsonb_array_elements(attributes)->'attribute_value'->>'current' as current_value
        FROM base_pricing_restaurant.bp_store_attributes_mapping
        WHERE attributes IS NOT NULL
    ),
    filtered_attributes AS (
        SELECT DISTINCT
            ej.store_id,
            azs.structure_name,
            azs.zone_structure_id,
            ej.current_value
        FROM extracted_jsonb ej
        INNER JOIN active_zone_structures azs 
            ON ej.attribute_name = azs.structure_name
    ),
    zone_matches AS (
        SELECT DISTINCT
            fa.store_id,
            fa.zone_structure_id,
            z.zone_id,
            fa.current_value
        FROM filtered_attributes fa
        INNER JOIN base_pricing_restaurant.bp_zones z 
            ON fa.zone_structure_id = z.zone_structure_id 
            AND fa.current_value = z.zone_name
            AND z.active = TRUE
    )
    INSERT INTO base_pricing_restaurant.bp_store_zone_mapping (
        store_id,
        zone_id,
        zone_structure_id
    )
    SELECT 
        store_id,
        zone_id,
        zone_structure_id
    FROM zone_matches zm
    WHERE NOT EXISTS (
        SELECT 1 
        FROM base_pricing_restaurant.bp_store_zone_mapping existing
        WHERE existing.store_id = zm.store_id 
            AND existing.zone_structure_id = zm.zone_structure_id
    );
    
    GET DIAGNOSTICS v_rows_inserted = ROW_COUNT;
    
    RAISE NOTICE 'Inserted % store-zone mappings', v_rows_inserted;
    
    RAISE NOTICE '  - Successful mappings inserted: %', v_rows_inserted;
    
END;
$procedure$
;
