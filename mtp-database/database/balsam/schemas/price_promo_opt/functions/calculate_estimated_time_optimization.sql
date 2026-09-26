--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:calculate_estimated_time_optimization runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for calculate_estimated_time_optimization

DROP FUNCTION if exists price_promo_opt.calculate_estimated_time_optimization;
CREATE OR REPLACE FUNCTION price_promo_opt.calculate_estimated_time_optimization(promo_id bigint)
 RETURNS TABLE(time_in_mins integer, promo_duration integer, store_count integer, product_count integer, discount_points integer)
 LANGUAGE plpgsql
AS $function$

DECLARE

    promo_data RECORD;

    model_params RECORD;

    promo_duration INT;

    product_count INT;

    store_count INT;

    discount_points INT;

    est_time_in_sec FLOAT;

	promo_duration_log FLOAT;

    time_in_mins INT;

BEGIN

    -- Fetch promo data for optimization

    WITH cte AS (

        SELECT

            pm.promo_id AS promo_id_,

            COUNT(distinct offer_identifier) AS discount_points

        FROM price_promo_opt.master_valid_offers mvo

        INNER JOIN price_promo.promo_master pm

            ON pm.promo_id = calculate_estimated_time_optimization.promo_id

        INNER JOIN price_promo_opt.fn_get_rules_data(pm.promo_id) AS rules_data

            ON mvo.offer_type = rules_data.offer_type

        WHERE (

            mvo.discount_filter BETWEEN rules_data.min_discount AND rules_data.max_discount

        )

        OR (

            mvo.discount_filter = ANY(COALESCE(rules_data.discount_type_values, ARRAY[]::integer[]))

        )

        GROUP BY pm.promo_id

    )

    SELECT

		pm.end_date - pm.start_date + 1 AS org_promo_duration, -- Original promo_duration

        pm.products_count AS org_product_count, -- Original products_count

        pm.stores_count AS org_store_count, -- Original stores_count

        pm.end_date - pm.start_date + 1 as promo_duration,

        pm.products_count AS product_count,

        pm.stores_count AS store_count,

        COALESCE(cte.discount_points, 0) AS discount_points

    INTO promo_data

    FROM price_promo.promo_master pm

    LEFT JOIN cte ON pm.promo_id = cte.promo_id_

    WHERE pm.promo_id = calculate_estimated_time_optimization.promo_id;



    IF promo_data IS NULL THEN

        RAISE EXCEPTION 'Promo ID % not found.', promo_id;

    END IF;



    -- Fetch model parameters

    SELECT coeff_promo_duration, coeff_products_count, coeff_stores_count, coeff_discount_points, intercept

    INTO model_params

    FROM price_promo_opt.model_time_estimate_parameters

    WHERE model_name = 'optimization_model' AND last_updated_at = (SELECT MAX(last_updated_at) FROM price_promo_opt.model_time_estimate_parameters where model_name = 'optimization_model');





    IF model_params IS NULL THEN

        RAISE EXCEPTION 'Model % not found.', model_name_var;

    END IF;



    -- Apply log transformation

    product_count := promo_data.product_count;

    store_count := promo_data.store_count;

    discount_points := promo_data.discount_points;



    -- Calculate estimated time

    est_time_in_sec := (

        model_params.coeff_promo_duration * LN(promo_data.promo_duration + 1) +

        model_params.coeff_products_count * product_count +

        model_params.coeff_stores_count * store_count +

        COALESCE(model_params.coeff_discount_points, 0) * discount_points +

        model_params.intercept

    );





    est_time_in_sec := GREATEST(EXP(est_time_in_sec) - 1, 15);



    -- Round to nearest minute

    time_in_mins := CEIL(est_time_in_sec/ 60);



	RETURN QUERY SELECT time_in_mins::INT, promo_data.org_promo_duration::INT, promo_data.org_store_count::INT, promo_data.org_product_count::INT,promo_data.discount_points::INT;

	EXCEPTION

    WHEN OTHERS THEN

        RAISE NOTICE 'Error: %', SQLERRM;

        RETURN QUERY SELECT NULL::INT, NULL::INT, NULL::INT, NULL::INT,NULL::INT WHERE FALSE;

END;

$function$



;