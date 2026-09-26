
--liquibase formatted sql
--changeset vaibhav@:pc_simulation_delete_ps_scenario_v3 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_simulation_delete_ps_scenario

DROP PROCEDURE IF EXISTS price_promo_opt.pc_simulation_delete_ps_scenario ;    
     
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_simulation_delete_ps_scenario(IN var_promo_id integer, IN arr_scenario_id integer[], IN edit_mode integer DEFAULT 0)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
BEGIN

    -- Delete existing recommended scenarios for given promo and scenario IDs
    -- Add additional condition if in edit_mode and default_flag is not 0

    IF edit_mode = 1 THEN
        DELETE FROM price_promo.ps_recommended_scenarios
        WHERE scenario_id = ANY(arr_scenario_id)
        AND recommendation_date > CURRENT_DATE;
    ELSE
        DELETE FROM price_promo.ps_recommended_scenarios
        WHERE scenario_id = ANY(arr_scenario_id);
    END IF;

END;
$procedure$
;
