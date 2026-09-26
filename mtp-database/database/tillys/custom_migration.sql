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

--changeset chandrashekar.s@impactanalytics.co:update_tanent_workflow_config stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: update tanent_workflow_config 
UPDATE inventory_smart.tenant_workflow_config
SET config = '{"sp_name": "SP_CONSTRAINTS_USER_RESERVE", "conflict_key": ["product_code", "dc_code", "channel", "inventory_source", "type"], "setall_columns": ["product_code", "dc_code", "channel", "inventory_source", "type", "quantity"], "update_columns": ["product_code", "quantity", "dc_code", "reservation_till_date", "comment", "channel", "inventory_source", "type"], "reserve_table_name": "inventory_smart.dc_reserve_quantity", "additional_columns_sp": ["department", "subdepartment", "class", "subclass", "style", "article", "brand", "vendor", "color_id_name", "style_color_desc"]}'
WHERE attribute_code = 10;

--changeset shreerakshan@impactanalytics.co:delete_unique_review_screen_info stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: delete all entries from unique_review_screen_info table
DELETE FROM global.unique_review_screen_info;

--changeset shreerakshan@impactanalytics.co:clear_unique_review_screen_info stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: clearing the data in unique_review_screen_info table
DELETE FROM global.unique_review_screen_info;

--changeset shreerakshan@impactanalytics.co:clear_unique_review_screen_info_table stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: removing the data in unique_review_screen_info table
DELETE FROM global.unique_review_screen_info;

--changeset shreerakshan@impactanalytics.co:unique_review_screen_info_table_clearing stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: removing the entries in unique_review_screen_info table
DELETE FROM global.unique_review_screen_info;