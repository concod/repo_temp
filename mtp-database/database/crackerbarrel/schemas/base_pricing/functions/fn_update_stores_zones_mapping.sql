--liquibase formatted sql
--changeset subhasis.jena@impactanalytics.co:fn_update_stores_zones_mapping stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.fn_update_stores_zones_mapping

DROP FUNCTION IF EXISTS base_pricing.fn_update_stores_zones_mapping;

CREATE OR REPLACE FUNCTION base_pricing.fn_update_stores_zones_mapping(stores_data jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    store RECORD;
    zone RECORD;
    new_zone_id INT;
    store_exists BOOLEAN;
    zone_structure_exists BOOLEAN;
BEGIN
    -- Loop over each store in the JSON data passed as a parameter
    FOR store IN SELECT * FROM jsonb_to_recordset(stores_data->'stores') AS s(store_id INT, zones JSONB)
    LOOP
        -- Check if store exists in bp_store_master
        SELECT EXISTS (SELECT 1 FROM base_pricing.bp_store_master WHERE store_id = store.store_id) INTO store_exists;
        
        IF store_exists THEN
            RAISE NOTICE 'Processing store_id: %', store.store_id;

            -- Loop over each zone in the current store's "zones" array
            FOR zone IN SELECT * FROM jsonb_to_recordset(store.zones) 
                        AS z(zone_structure_id INT, zone_name TEXT, zone_id INT)
            LOOP
                -- Check if zone_structure_id exists in bp_zone_structure
                SELECT EXISTS (SELECT 1 FROM base_pricing.bp_zone_structure WHERE zone_structure_id = zone.zone_structure_id) INTO zone_structure_exists;

                IF zone_structure_exists THEN
                    RAISE NOTICE 'Processing zone_id: %, zone_name: %, zone_structure_id: %', zone.zone_id, zone.zone_name, zone.zone_structure_id;

                    -- Check if zone already exists with same zone_name and zone_structure_id
                    SELECT zone_id INTO new_zone_id
                    FROM base_pricing.bp_zones
                    WHERE zone_structure_id = zone.zone_structure_id AND zone_name = zone.zone_name;

                    IF new_zone_id IS NULL THEN
                        -- Zone does not exist, insert a new one
                        INSERT INTO base_pricing.bp_zones (zone_structure_id, zone_name)
                        VALUES (zone.zone_structure_id, zone.zone_name)
                        RETURNING zone_id INTO new_zone_id;
                        RAISE NOTICE 'Inserted new zone_id: %', new_zone_id;
                    ELSE
                        -- Zone exists, use existing zone_id
                        RAISE NOTICE 'Using existing zone_id: %', new_zone_id;
                    END IF;

                    -- Use new_zone_id to update store_zone_mapping with explicit alias
                    INSERT INTO base_pricing.bp_store_zone_mapping (store_id, zone_id, zone_structure_id) 
                    VALUES (store.store_id, new_zone_id, zone.zone_structure_id) 
                    ON CONFLICT (store_id, zone_structure_id)
                    DO UPDATE SET zone_id = EXCLUDED.zone_id;
                    RAISE NOTICE 'Updated store_zone_mapping for store_id: %, zone_id: %, zone_structure_id: %', store.store_id, new_zone_id, zone.zone_structure_id;
                ELSE
                    RAISE NOTICE 'Zone structure ID % does not exist in bp_zone_structure', zone.zone_structure_id;
                END IF;
            END LOOP;
        ELSE
            RAISE NOTICE 'Store ID % does not exist in bp_store_master', store.store_id;
        END IF;
    END LOOP;

    RAISE NOTICE 'Update of stores and zones mapping completed successfully.';
END $function$
;