--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_simulation_delete_ia_proj runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_simulation_delete_ia_proj

DROP PROCEDURE IF EXISTS price_promo_opt.pc_simulation_delete_ia_proj ;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_simulation_delete_ia_proj(IN var_promo_id integer, IN edit_mode integer DEFAULT 0, IN var_specific_start_date date DEFAULT NULL::date, IN var_specific_end_date date DEFAULT NULL::date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

BEGIN

---------------------------------------------------------------------------------

RAISE NOTICE 'Before enable_nestloop=%', current_setting('enable_nestloop', true);
--PERFORM set_config('enable_nestloop', 'off', true);
SET LOCAL enable_nestloop to off;
RAISE NOTICE 'enable_nestloop=%', current_setting('enable_nestloop', true);

---------------------------------------------------------------------------------


    -- Delete existing recommended scenarios for the given promo_id

    -- Add additional condition if in edit_mode and default_flag is not 0



    IF edit_mode = 1 THEN

        IF var_specific_start_date IS NOT NULL AND var_specific_end_date IS NOT NULL THEN

            DELETE FROM price_promo.ps_recommended_ia_projected

            WHERE promo_id = var_promo_id

            AND recommendation_date BETWEEN var_specific_start_date AND var_specific_end_date;

        ELSE

            DELETE FROM price_promo.ps_recommended_ia_projected

            WHERE promo_id = var_promo_id

            AND recommendation_date > CURRENT_DATE;

        END IF;

    ELSE

        IF var_specific_start_date IS NOT NULL AND var_specific_end_date IS NOT NULL THEN

            DELETE FROM price_promo.ps_recommended_ia_projected

            WHERE promo_id = var_promo_id

            AND recommendation_date BETWEEN var_specific_start_date AND var_specific_end_date;

        ELSE

            DELETE FROM price_promo.ps_recommended_ia_projected

            WHERE promo_id = var_promo_id;

        END IF;

    END IF;



END;

$procedure$
;
