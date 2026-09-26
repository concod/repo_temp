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

--changeset raj.mohan@impactanalytics.co:delete_user_preference_table_config stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: delete_user_preference_table_config
DELETE FROM global.user_preference_table_config where tc_code= '1503';

--changeset sampath.srivathsav@impactanalytics.co:delete_rows_in_product_supersession_mapping stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: delete rows in product_supersession_mapping and product_supersession_attribute and product_supersession_store_priority
DELETE FROM inventory_smart.product_supersession_attribute psa
USING inventory_smart.product_supersession_mapping psm
WHERE psa.ps_code = psm.ps_code
  AND (
        psm.created_by = 'qa@impactanalytics.co'
     OR psm.created_by = 'kristen.swann@impactanalytics.co'
  );

DELETE FROM inventory_smart.product_supersession_store_priority pss
USING inventory_smart.product_supersession_mapping psm
WHERE pss.ps_code = psm.ps_code
  AND (
        psm.created_by = 'qa@impactanalytics.co'
     OR psm.created_by = 'kristen.swann@impactanalytics.co'
  );  

DELETE FROM inventory_smart.product_supersession_mapping
WHERE created_by = 'qa@impactanalytics.co'
   OR created_by = 'kristen.swann@impactanalytics.co';
