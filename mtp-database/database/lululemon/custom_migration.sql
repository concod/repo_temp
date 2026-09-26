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


--changeset nikhil.hallale@impactanalytics.co:insert entry in user_access_hierarchy_mapping stripComments:false splitStatements:false context:Release_1 labels:insert entry in user_access_hierarchy_mapping
--comment: inserting minimal entry (user_code and acl_code)
INSERT INTO global.user_access_hierarchy_mapping (user_code, acl_code) VALUES (251, 59);


--changeset shreeraksha.n@impactanalytics.co:making is_tool_edited as false stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: making is_tool_edited as false for tc=9000 name = upload_store_groups_template
UPDATE global.table_configurations SET is_tool_edited = false WHERE tc_code = 9000 AND name = 'upload_store_groups_template';

