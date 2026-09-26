--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_update_is_processing_flag runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_update_is_processing_flag

DROP PROCEDURE if exists price_promo_opt.pc_update_is_processing_flag;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_update_is_processing_flag(IN var_promo_id integer[], IN value integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
BEGIN
    -- When value is set to 1, update the is_under_processing flag
    IF value = 1 THEN
        UPDATE price_promo.promo_master
        SET is_under_processing = value
        WHERE promo_id = ANY(var_promo_id);
    
    -- When value is set to 0, update the is_under_processing flag with additional conditions
    ELSIF value = 0 THEN
        UPDATE price_promo.promo_master
        SET is_under_processing = 0
        WHERE promo_id = ANY(var_promo_id)
        AND promo_id NOT IN (
            SELECT pm.promo_id
            FROM price_promo.promo_master pm
            INNER JOIN price_promo.tb_action_log_master talm 
                ON pm.promo_id = ANY(talm.promo_ids)
            WHERE talm.processing_status = 1 
              AND pm.promo_id = ANY(var_promo_id)
        );
    END IF;
END;
$procedure$
;

