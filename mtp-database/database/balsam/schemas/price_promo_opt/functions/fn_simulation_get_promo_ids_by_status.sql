--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:fn_simulation_get_promo_ids_by_status runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for fn_simulation_get_promo_ids_by_status

DROP FUNCTION if exists price_promo_opt.fn_simulation_get_promo_ids_by_status;
CREATE OR REPLACE FUNCTION price_promo_opt.fn_simulation_get_promo_ids_by_status(statuses integer[], is_resim_flag integer[] DEFAULT ARRAY[0, '-1'::integer])
 RETURNS integer[]
 LANGUAGE plpgsql
AS $function$



DECLARE



    promo_ids INT[];



BEGIN



    -- Retrieve the list of promo_id values based on the provided statuses and is_resim_flag, and store them in an array



    SELECT ARRAY(



        SELECT DISTINCT promo_id



        FROM price_promo.promo_master



        WHERE status = ANY(statuses)



        AND last_approved_scenario_id IS NOT NULL



        AND start_date > CURRENT_DATE



        AND is_auto_resimulated = ANY(is_resim_flag)  -- Assuming is_auto_resimulated is the relevant column



    )



    INTO promo_ids;







    -- Return the array of promo_ids



    RETURN promo_ids;



END;



$function$



;