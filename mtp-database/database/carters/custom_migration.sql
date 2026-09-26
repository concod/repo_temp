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


--changeset raj.mohan@impactanalytics.co:del_user_preference_table_config stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: del_user_preference_table_config
DELETE FROM global.user_preference_table_config where true;

--changeset aman_lakkoju:adding_data_for_module_code_10004_rcl_master stripComments:false splitStatements:false context:Release_1 labels:delete_user_preferences_for_QA_role
--comment: adding_data_for_module_code_10004_rcl_master

INSERT INTO global.rcl_master (
    module_code,
    level,
    hierarchy_selections,
    validity,
    priority,
    is_deleted,
    created_by,
    updated_by,
    created_at,
    updated_at,
    rcl_lowest_level,
    is_default
)
VALUES (
    10004,                                
    '{l0_name,l1_name}',                  
    '{}'::jsonb,                          
    '{[2024-01-01,2050-12-31)}'::datemultirange,  
    65536,                                
    false,                                
    251,                                  
    NULL,                                 
    '2024-07-18 08:50:33.401',            
    NULL,                                 
    '{}'::varchar[],                      
    true                                  
);

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

--changeset shreeraksha.n@impactanalytics.co:making is_tool_edited as false stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: making is_tool_edited as false for tc=9000 name = upload_store_groups_template
UPDATE global.table_configurations SET is_tool_edited = false WHERE tc_code = 9000 AND name = 'upload_store_groups_template';