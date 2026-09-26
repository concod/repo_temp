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

--changeset pritesh.jain@impactanalytics.co:update_product_print_ia_chars_2 context:Release_1 labels:Custom_Migration_Technique
--comment: replacing_special_chars_with_ia_chars_v2
UPDATE "global".product_attributes_filter
SET product_print = 
Replace(Replace(Replace(Replace(Replace(Replace(Replace(Replace(Replace(Replace(Replace(Replace(Replace(Replace(Replace(Replace(Replace(Replace(Replace(Replace(Replace(Replace(Replace(Replace(Replace(Replace(Replace(Replace(Replace(Replace(
    product_print, 
    '''', '__ia_char_01'), 
    '"', '__ia_char_02'), 
    '/', '__ia_char_03'), 
    '\\', '__ia_char_04'), 
    '`', '__ia_char_05'), 
    '~', '__ia_char_06'), 
    '!', '__ia_char_07'), 
    '@', '__ia_char_08'), 
    '#', '__ia_char_09'), 
    '$', '__ia_char_10'), 
    '%', '__ia_char_11'), 
    '^', '__ia_char_12'), 
    '&', '__ia_char_13'), 
    '*', '__ia_char_14'), 
    '(', '__ia_char_15'), 
    ')', '__ia_char_16'), 
    '=', '__ia_char_19'), 
    '+', '__ia_char_20'), 
    '{', '__ia_char_21'), 
    '}', '__ia_char_22'), 
    '[', '__ia_char_23'), 
    ']', '__ia_char_24'), 
    '|', '__ia_char_25'), 
    ':', '__ia_char_26'), 
    ';', '__ia_char_27'), 
    '<', '__ia_char_28'), 
    '>', '__ia_char_29'), 
    ',', '__ia_char_30'), 
    '.', '__ia_char_31'), 
    '?', '__ia_char_32');