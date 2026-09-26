--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_simulation_delete_ia_proj_stack runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_simulation_delete_ia_proj_stack

DROP PROCEDURE if exists price_promo_opt.pc_simulation_delete_ia_proj_stack;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_simulation_delete_ia_proj_stack(IN var_promo_id integer, IN edit_mode integer DEFAULT 0, IN var_specific_start_date date DEFAULT NULL::date, IN var_specific_end_date date DEFAULT NULL::date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

BEGIN

    -- Delete existing recommended scenarios for the given promo_id

    -- Apply additional conditions if in edit_mode



    IF edit_mode = 1 THEN

        IF var_specific_start_date IS NOT NULL AND var_specific_end_date IS NOT NULL THEN

            DELETE FROM price_promo.ps_recommended_stack_ia

            WHERE promo_id = var_promo_id

            AND recommendation_date BETWEEN var_specific_start_date AND var_specific_end_date;

        ELSE

            DELETE FROM price_promo.ps_recommended_stack_ia

            WHERE promo_id = var_promo_id

            AND recommendation_date >= current_date;

        END IF;

    ELSE

        IF var_specific_start_date IS NOT NULL AND var_specific_end_date IS NOT NULL THEN

            DELETE FROM price_promo.ps_recommended_stack_ia

            WHERE promo_id = var_promo_id

            AND recommendation_date BETWEEN var_specific_start_date AND var_specific_end_date;

        ELSE

            DELETE FROM price_promo.ps_recommended_stack_ia

            WHERE promo_id = var_promo_id;

        END IF;

    END IF;



END;

$procedure$
;

