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


--changeset vamsi.balaga@impactanalytics.co:delete_inactive_products_2210-0214 stripComments:false splitStatements:false context:Release_1_0 labels:Custom_Migration_Technique
--comment: delete inactive products from event_product table and insert uam screen in screen_master table
INSERT INTO "global".screen_master
(screen_code, screen_name, is_active, description, dimensions, application, "label")
VALUES(300, 'UAM screen', true, 'plansmart tenant config', '{}', '{3}', NULL);

delete from price_promo.promo_product_hierarchy
where hierarchy_id in (
    select hierarchy_id from price_promo.tb_product_hierarchy_mapping tphm 
    where is_active = 0
);
delete from price_promo.event_product_hierarchy
where hierarchy_id in (
    select hierarchy_id from price_promo.tb_product_hierarchy_mapping tphm 
    where is_active = 0
);
