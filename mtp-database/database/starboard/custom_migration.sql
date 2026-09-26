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

--changeset raj.mohan@impactanalytics.co:mod_master_fixes stripComments:false splitStatements:false context:Release_1 labels:mod_master_fixes
--comment: mod_master_fixes
DELETE FROM global.module_master where screen_code= '2000';

--changeset ashvin.prasanth@impactanalytics.co:reset_custom_migration_2 stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment:  custom_migration
TRUNCATE TABLE global.product_master cascade;
TRUNCATE TABLE global.product_attributes;
TRUNCATE TABLE global.product_attributes_filter;
TRUNCATE TABLE global.product_hierarchies_filter cascade;
TRUNCATE TABLE global.store_master cascade;
TRUNCATE TABLE global.store_attributes;
TRUNCATE TABLE global.store_attributes_filter cascade;
TRUNCATE TABLE global.store_hierarchies_filter;

--changeset aditya.biradar@impactanalytics.co:reset_custom_migration_3 stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment:  custom_migration

UPDATE global.product_attributes_filter t
SET product_bucket_code =
  (
    CONCAT(
      -- l1
      COALESCE((
        SELECT SUM(ASCII(ch))
        FROM regexp_split_to_table(COALESCE(t.l1_name, 'NULL'), '') AS ch
      ), 0),

      -- l2
      COALESCE((
        SELECT SUM(ASCII(ch))
        FROM regexp_split_to_table(COALESCE(t.l2_name, 'NULL'), '') AS ch
      ), 0),

      -- l3
      COALESCE((
        SELECT SUM(ASCII(ch))
        FROM regexp_split_to_table(COALESCE(t.l3_name, 'NULL'), '') AS ch
      ), 0),

      -- l4
      COALESCE((
        SELECT SUM(ASCII(ch))
        FROM regexp_split_to_table(COALESCE(t.l4_name, 'NULL'), '') AS ch
      ), 0)
    )
  )::bigint
WHERE t.product_bucket_code IS NULL;



--changeset aditya.biradar@impactanalytics.co:reset_custom_migration_4 stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment:  custom_migration

UPDATE global.product_attributes_filter t
SET product_bucket_code = CAST(
    CONCAT(
        COALESCE((
            SELECT SUM(ASCII(ch))
            FROM regexp_split_to_table(COALESCE(t.l0_name, 'NULL'), '') AS ch
        )::text, '0'),
        COALESCE((
            SELECT SUM(ASCII(ch))
            FROM regexp_split_to_table(COALESCE(t.l1_name, 'NULL'), '') AS ch
        )::text, '0'),
        COALESCE((
            SELECT SUM(ASCII(ch))
            FROM regexp_split_to_table(COALESCE(t.l2_name, 'NULL'), '') AS ch
        )::text, '0'),
        COALESCE((
            SELECT SUM(ASCII(ch))
            FROM regexp_split_to_table(COALESCE(t.l3_name, 'NULL'), '') AS ch
        )::text, '0')
    ) AS bigint
);