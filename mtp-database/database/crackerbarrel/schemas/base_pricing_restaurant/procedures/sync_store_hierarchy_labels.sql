--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:sync_store_hierarchy_labels runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for sync_store_hierarchy_labels

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sync_store_hierarchy_labels;

CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sync_store_hierarchy_labels()
 LANGUAGE plpgsql
AS $procedure$
DECLARE
    hierarchy_record RECORD;
    screen_record RECORD;
    updated_count INTEGER := 0;
    new_hierarchy_json JSONB;
BEGIN
    RAISE NOTICE 'Syncing store hierarchies...';
    
    FOR hierarchy_record IN 
        SELECT 
            store_hierarchy_level_id,
            store_hierarchy_level_value,
            store_hierarchy_level_label
        FROM base_pricing_restaurant.bp_store_hierarchy_level
        ORDER BY store_hierarchy_level_id
    LOOP
        RAISE NOTICE 'Processing store hierarchy: % (ID: %)', 
            hierarchy_record.store_hierarchy_level_value, 
            hierarchy_record.store_hierarchy_level_id;
        
        FOR screen_record IN
            SELECT 
                screen_id,
                screen_name,
                hierarchies
            FROM base_pricing_restaurant.bp_screen_hierarchies
            WHERE hierarchies::text LIKE '%s' || hierarchy_record.store_hierarchy_level_id || '_ids%'
        LOOP
            RAISE NOTICE '  Found in screen: % (ID: %)', 
                screen_record.screen_name, 
                screen_record.screen_id;
            
            new_hierarchy_json := screen_record.hierarchies;
            
            -- Update store_filter hierarchies (both hierarchies and store_group arrays)
            IF new_hierarchy_json ? 'store_filter' THEN
                new_hierarchy_json := base_pricing_restaurant.update_store_hierarchy_section(
                    new_hierarchy_json, 
                    'store_filter', 
                    'hierarchies', 
                    hierarchy_record
                );
                
                -- Also update store_group array if it exists
                new_hierarchy_json := base_pricing_restaurant.update_store_hierarchy_section(
                    new_hierarchy_json, 
                    'store_filter', 
                    'store_group', 
                    hierarchy_record
                );
            END IF;
            
            -- Update the screen record if changes were made
            IF new_hierarchy_json != screen_record.hierarchies THEN
                UPDATE base_pricing_restaurant.bp_screen_hierarchies
                SET hierarchies = new_hierarchy_json
                WHERE screen_id = screen_record.screen_id;
                
                updated_count := updated_count + 1;
                RAISE NOTICE '    Updated screen: %', screen_record.screen_name;
            END IF;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Store hierarchy sync completed. Updated % screen configurations.', updated_count;
END;
$procedure$
;
