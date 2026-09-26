--liquibase formatted sql
--     
--      #######  ##    ## ##       ##    ##          ###    ########  ########  ######## ##    ## ########   ######  
--     ##     ## ###   ## ##        ##  ##          ## ##   ##     ## ##     ## ##       ###   ## ##     ## ##    ## 
--     ##     ## ####  ## ##         ####          ##   ##  ##     ## ##     ## ##       ####  ## ##     ## ##       
--     ##     ## ## ## ## ##          ##          ##     ## ########  ########  ######   ## ## ## ##     ##  ######  
--     ##     ## ##  #### ##          ##          ######### ##        ##        ##       ##  #### ##     ##       ## 
--     ##     ## ##   ### ##          ##          ##     ## ##        ##        ##       ##   ### ##     ## ##    ## 
--      #######  ##    ## ########    ##          ##     ## ##        ##        ######## ##    ## ########   ######  
--                                                                                     
--     ##    ##  #######        ########  ########  ##        ######                                                 
--     ###   ## ##     ##       ##     ## ##     ## ##       ##    ##                                                
--     ####  ## ##     ##       ##     ## ##     ## ##       ##                                                      
--     ## ## ## ##     ##       ##     ## ##     ## ##        ######                                                 
--     ##  #### ##     ##       ##     ## ##     ## ##             ##                                                
--     ##   ### ##     ##       ##     ## ##     ## ##       ##    ##                                                
--     ##    ##  #######        ########  ########  ########  ######                                                 
--  

--changeset ashish@impactanalytics.co:reset_custom_migration stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: initial changeset for custom_migration
DELETE FROM liquibase.databasechangelog where filename like '%custom_migration.sql%';

--changeset linu.nazil:constraint_multi_store_att_updates stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: constraint_multi_store_att_updates
update inventory_smart.rcl_constraint_master_rule set store_hierarchy_level = 'psa_name' where true;

--changeset shreyansh.pandey@impactanalytics.co:reset_filter_user_configurations_mapping stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: filter_user_configurations_mapping_CNA_screen_entries_remove
DELETE FROM global.user_preference_table_config where tc_code = 96;

-- changeset aaqib.khan@impactanalytics.co:add_planning_group stripComments:false splitStatements:false context:add_planning_group labels:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS-01 
-- comment: deleting redundant values to matchh with UAT version of source_size
DELETE FROM size_smart.tb_source_size
WHERE size_id NOT IN (SELECT id FROM size_smart.tb_size);

-- changeset rajesh.kumar@impactanalytics.co:add_display_article stripComments:false splitStatements:false context:add_display_article labels:MTP-113918
-- comment: backfill display_article in plan_attributes from article when missing
INSERT INTO inventory_smart.plan_attributes (plan_code, attribute_name, attribute_value)
SELECT
  pa.plan_code,
  'display_article' AS attribute_name,
  COALESCE('{' || string_agg('"' || regexp_replace(elem, '.*_', '') || '"', ',') || '}', '{}') AS attribute_value
FROM inventory_smart.plan_attributes pa
CROSS JOIN LATERAL unnest(pa.attribute_value::text[]) AS u(elem)
WHERE pa.attribute_name = 'article'
  AND NOT EXISTS (
    SELECT 1
    FROM inventory_smart.plan_attributes pa2
    WHERE pa2.plan_code = pa.plan_code
      AND pa2.attribute_name = 'display_article'
  )
GROUP BY pa.plan_code
ON CONFLICT (plan_code, attribute_name) DO NOTHING;

--changeset shreyansh.pandey@impactanalytics.co:reset_filter_user_configurations_mapping_AID stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: table_user_configurations_mapping_AID_entries_remove
DELETE FROM global.user_preference_table_config where tc_code = 122;

--changeset tarun.tyagi:update_rule_expression_auto_allocation stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: Update rule_expression column for auto-allocation rule_type with prefix notation (Polish notation) using AND operator
UPDATE inventory_smart.dc_store_policy_user_rule
SET rule_expression = (
    SELECT
        -- Build prefix expression array: (N-1 "AND" operators) + (N keys)
        ARRAY(
            -- Generate N-1 "AND" operators where N is the number of keys
            SELECT 'AND'
            FROM generate_series(1, GREATEST(array_length(filtered_keys, 1) - 1, 0))
        ) || filtered_keys
    FROM (
        -- Extract keys from values JSONB, excluding auto_approve and auto_release_required
        SELECT ARRAY(
            SELECT key
            FROM jsonb_object_keys(dc_store_policy_user_rule.values) AS key
            WHERE key NOT IN ('auto_approve', 'auto_release_required')
            ORDER BY key  -- Maintain consistent ordering
        ) AS filtered_keys
    ) AS subquery
)
WHERE rule_type = 'auto-allocation'
  AND rule_expression IS NULL;