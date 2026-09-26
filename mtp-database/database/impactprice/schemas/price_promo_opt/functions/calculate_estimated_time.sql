--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:calculate_estimated_time runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for calculate_estimated_time

DROP FUNCTION if exists price_promo_opt.calculate_estimated_time;
CREATE OR REPLACE FUNCTION price_promo_opt.calculate_estimated_time(promo_id integer, criteria text)
 RETURNS double precision
 LANGUAGE plpgsql
AS $function$



DECLARE



    promo_data RECORD;



    model_params RECORD;



    promo_duration FLOAT;



    product_count FLOAT;



    store_count FLOAT;



    discount_points FLOAT;



    est_time_in_sec FLOAT;



    model_name_var TEXT;



BEGIN



    -- Construct model name dynamically



    model_name_var := criteria || '_model';







    -- Fetch promo data based on criteria



    IF criteria = 'simulation' THEN



        SELECT



            CASE



                WHEN pm.end_date - pm.start_date + 1 <= 7 THEN pm.end_date - pm.start_date + 1



                WHEN pm.end_date - pm.start_date + 1 <= 14 THEN 14



                WHEN pm.end_date - pm.start_date + 1 <= 21 THEN 21



                WHEN pm.end_date - pm.start_date + 1 <= 200 THEN ((pm.end_date - pm.start_date + 1) / 7) * 7



                ELSE 200



            END AS promo_duration,



            CASE



                WHEN pm.products_count <= 1000 THEN ROUND(pm.products_count / 100.0) * 100



                WHEN pm.products_count <= 10000 THEN ROUND(pm.products_count / 1000.0) * 1000



                WHEN pm.products_count <= 200000 THEN ROUND(pm.products_count / 10000.0) * 10000



                ELSE pm.products_count



            END AS product_count,



            CASE



                WHEN pm.stores_count <= 150 THEN ROUND(pm.stores_count / 10.0) * 10



                ELSE pm.stores_count



            END AS store_count,



            0 AS discount_points



        INTO promo_data



        FROM price_promo.promo_master pm



        WHERE pm.promo_id = $1;  -- FIXED PARAMETER REFERENCE







    ELSIF criteria = 'optimization' THEN



        WITH cte AS (



            SELECT



                pm.promo_id AS promo_id_,



                COUNT(*) AS discount_points



            FROM price_promo.master_valid_offers mvo



            INNER JOIN price_promo.promo_master pm



                ON pm.promo_id = $1  -- FIXED PARAMETER REFERENCE



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



            CASE



                WHEN pm.end_date - pm.start_date + 1 <= 7 THEN pm.end_date - pm.start_date + 1



                WHEN pm.end_date - pm.start_date + 1 <= 14 THEN 14



                WHEN pm.end_date - pm.start_date + 1 <= 21 THEN 21



                WHEN pm.end_date - pm.start_date + 1 <= 200 THEN ((pm.end_date - pm.start_date + 1) / 7) * 7



                ELSE 200



            END AS promo_duration,



            CASE



                WHEN pm.products_count <= 1000 THEN ROUND(pm.products_count / 100.0) * 100



                WHEN pm.products_count <= 10000 THEN ROUND(pm.products_count / 1000.0) * 1000



                WHEN pm.products_count <= 200000 THEN ROUND(pm.products_count / 10000.0) * 10000



                ELSE pm.products_count



            END AS product_count,



            CASE



                WHEN pm.stores_count <= 150 THEN ROUND(pm.stores_count / 10.0) * 10



                ELSE pm.stores_count



            END AS store_count,



            COALESCE(cte.discount_points, 0) AS discount_points



        INTO promo_data



        FROM price_promo.promo_master pm



        LEFT JOIN cte ON pm.promo_id = cte.promo_id_



        WHERE pm.promo_id = $1;  -- FIXED PARAMETER REFERENCE







    ELSE



        RAISE EXCEPTION 'Invalid criteria: %', criteria;



    END IF;







    -- Error handling if no data found



    IF promo_data IS NULL THEN



        RAISE EXCEPTION 'Promo ID % not found.', promo_id;



    END IF;







    -- Fetch model parameters



    SELECT coeff_promo_duration, coeff_products_count, coeff_stores_count, coeff_discount_points, intercept



    INTO model_params



    FROM public.model_time_estimate_parameters



    WHERE model_name = model_name_var;







    IF model_params IS NULL THEN



        RAISE EXCEPTION 'Model % not found.', model_name_var;



    END IF;







    -- Apply log transformation



    promo_duration := LN(promo_data.promo_duration + 1);



    product_count := promo_data.product_count;



    store_count := promo_data.store_count;



    discount_points := promo_data.discount_points;







    -- Calculate estimated time



    est_time_in_sec := (



        model_params.coeff_promo_duration * promo_duration +



        model_params.coeff_products_count * product_count +



        model_params.coeff_stores_count * store_count +



        COALESCE(model_params.coeff_discount_points, 0) * discount_points +



        model_params.intercept



    );







    -- Ensure a minimum value



    RETURN GREATEST(EXP(est_time_in_sec) - 1, 15);







EXCEPTION



    WHEN OTHERS THEN



        RAISE NOTICE 'Error: %', SQLERRM;



        RETURN NULL;



END;



$function$
;

