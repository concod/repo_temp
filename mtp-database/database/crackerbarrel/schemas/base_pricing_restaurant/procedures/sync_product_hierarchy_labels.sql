--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:sync_product_hierarchy_labels runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for sync_product_hierarchy_labels

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sync_product_hierarchy_labels;

CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sync_product_hierarchy_labels()
 LANGUAGE plpgsql
AS $procedure$
DECLARE
    hierarchy_record RECORD;
    screen_record RECORD;
    updated_count INTEGER := 0;
    new_hierarchy_json JSONB;
BEGIN
    RAISE NOTICE 'Syncing product hierarchies...';
    
    FOR hierarchy_record IN 
        SELECT 
            product_hierarchy_level_id,
            product_hierarchy_level_value,
            product_hierarchy_level_label
        FROM base_pricing_restaurant.bp_product_hierarchy_level
        ORDER BY product_hierarchy_level_id
    LOOP
        RAISE NOTICE 'Processing product hierarchy: % (ID: %)', 
            hierarchy_record.product_hierarchy_level_value, 
            hierarchy_record.product_hierarchy_level_id;
        
        FOR screen_record IN
            SELECT 
                screen_id,
                screen_name,
                hierarchies
            FROM base_pricing_restaurant.bp_screen_hierarchies
            WHERE hierarchies::text LIKE '%l' || hierarchy_record.product_hierarchy_level_id || '_ids%'
        LOOP
            RAISE NOTICE '  Found in screen: % (ID: %)', 
                screen_record.screen_name, 
                screen_record.screen_id;
            
            new_hierarchy_json := screen_record.hierarchies;
            
            -- Update product_filter hierarchies
            IF new_hierarchy_json ? 'product_filter' THEN
                new_hierarchy_json := base_pricing_restaurant.update_product_hierarchy_section(
                    new_hierarchy_json, 
                    'product_filter', 
                    'hierarchies', 
                    hierarchy_record
                );
            END IF;
            
            -- Update specific hierarchies  
            IF new_hierarchy_json ? 'product_filter' THEN
                new_hierarchy_json := base_pricing_restaurant.update_product_hierarchy_section(
                    new_hierarchy_json, 
                    'product_filter', 
                    'product_group', 
                    hierarchy_record
                );
            END IF;

	        IF new_hierarchy_json ? 'specific' THEN
	                new_hierarchy_json := base_pricing_restaurant.update_product_hierarchy_section(
	                    new_hierarchy_json, 
	                    'specific', 
	                    'hierarchies', 
	                    hierarchy_record
	                );
	            END IF;
			
			 IF new_hierarchy_json ? 'specific' THEN
	                new_hierarchy_json := base_pricing_restaurant.update_product_hierarchy_section(
	                    new_hierarchy_json, 
	                    'product_group', 
	                    'hierarchies', 
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
    
    RAISE NOTICE 'Product hierarchy sync completed. Updated % screen configurations.', updated_count;
END;
$procedure$
;
