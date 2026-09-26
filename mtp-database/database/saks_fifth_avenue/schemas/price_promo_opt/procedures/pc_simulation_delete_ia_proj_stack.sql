
--liquibase formatted sql
--changeset vaibhav@:pc_simulation_delete_ia_proj_stack_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_simulation_delete_ia_proj_stack

DROP PROCEDURE IF EXISTS price_promo_opt.pc_simulation_delete_ia_proj_stack ;
     
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_simulation_delete_ia_proj_stack(IN var_promo_id integer, IN edit_mode integer DEFAULT 0)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

BEGIN
IF edit_mode = 1 THEN

    -- Delete existing recommended scenarios for given promo and scenario IDs

	DELETE FROM price_promo.ps_recommended_stack_ia

    WHERE promo_id = var_promo_id

	AND recommendation_date > CURRENT_DATE;
ELSE

 	DELETE FROM price_promo.ps_recommended_stack_ia

    WHERE promo_id = var_promo_id;
END IF;

END;

$procedure$
;
