
--liquibase formatted sql
--changeset vaibhav@:pc_simulation_delete_ia_proj_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_simulation_delete_ia_proj

DROP PROCEDURE IF EXISTS price_promo_opt.pc_simulation_delete_ia_proj ;    
     
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_simulation_delete_ia_proj(IN var_promo_id integer, IN edit_mode integer DEFAULT 0)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
BEGIN

    -- Delete existing recommended scenarios for the given promo_id
    -- Add additional condition if in edit_mode and default_flag is not 0

    IF edit_mode = 1 THEN
        DELETE FROM price_promo.ps_recommended_ia_projected
        WHERE promo_id = var_promo_id
        AND recommendation_date > CURRENT_DATE;
    ELSE
        DELETE FROM price_promo.ps_recommended_ia_projected
        WHERE promo_id = var_promo_id;
    END IF;

END;
$procedure$
;
