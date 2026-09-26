--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:calculate_estimated_time_simulation runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for calculate_estimated_time_simulation

DROP FUNCTION if exists price_promo_opt.calculate_estimated_time_simulation;
CREATE OR REPLACE FUNCTION price_promo_opt.calculate_estimated_time_simulation(promo_id integer, store_count integer, product_count integer, scenario_count integer)
 RETURNS TABLE(time_in_mins integer, promo_duration integer, original_store_count integer, original_product_count integer, scenario_count_out integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
    promo_data RECORD;
    model_params RECORD;
    est_time_in_sec FLOAT;
    time_in_mins INT;
BEGIN
    SELECT 
        pm.end_date - pm.start_date + 1 AS org_promo_duration,
        products_count AS original_product_count,
        stores_count AS original_store_count
    INTO promo_data
    FROM price_promo.promo_master pm
    WHERE pm.promo_id = $1;

    IF promo_data IS NULL THEN
        RAISE EXCEPTION 'Promo ID % not found.', promo_id;
    END IF;
	SELECT m.coeff_promo_duration, m.coeff_products_count, m.coeff_stores_count, m.intercept
	INTO model_params
	FROM price_promo_opt.model_time_estimate_parameters m
	WHERE model_name = 'simulation_model'
	ORDER BY last_updated_at DESC
	LIMIT 1;
	
	IF NOT FOUND THEN
	    -- Return fixed 1 minute in seconds
    est_time_in_sec := 60; 
	ELSE
	    est_time_in_sec := (
	        model_params.coeff_promo_duration * LN(promo_data.org_promo_duration + 1) +
	        model_params.coeff_products_count * promo_data.original_product_count +
	        model_params.coeff_stores_count   * promo_data.original_store_count +
	        model_params.intercept
	    );
	END IF;

-- If fallback case (we forced est_time_in_sec := 60 earlier)
IF est_time_in_sec = 60 THEN
    -- Directly return 1 minute
    time_in_mins := 1;
ELSE
       -- Adjust for scenario count
    est_time_in_sec := 
	CASE
	    WHEN scenario_count > 1 THEN est_time_in_sec * 1.2
	    ELSE est_time_in_sec
	END;
    -- Normal flow: transform and enforce minimum of 15 seconds
    est_time_in_sec := GREATEST(EXP(est_time_in_sec) - 1, 15);
    time_in_mins := CEIL(est_time_in_sec / 60);
END IF;

    RETURN QUERY SELECT
        time_in_mins::INT, 
        promo_data.org_promo_duration::INT,
        promo_data.original_store_count::INT,
        promo_data.original_product_count::INT, 
        scenario_count AS scenario_count_out;
        
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error: %', SQLERRM;
        RETURN QUERY SELECT NULL::INT, NULL::INT, NULL::INT, NULL::INT, NULL::INT WHERE FALSE;
END;
$function$
;

