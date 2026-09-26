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
