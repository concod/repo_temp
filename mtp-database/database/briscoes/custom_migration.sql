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

--changeset raj.mohan:user_master_fix stripComments:false splitStatements:true context:MTP-130441 labels:MTP-130441
--comment: user_master_fix
delete from global.user_master where email like 'iaraja%';
