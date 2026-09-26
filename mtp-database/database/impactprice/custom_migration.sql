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

--changeset cascade:create_tb_store_master_version_partition_1 stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: create partition for tb_store_master_version version_code=1
CREATE TABLE IF NOT EXISTS pricesmart.tb_store_master_version_1 PARTITION OF pricesmart.tb_store_master_version FOR VALUES IN (1);
