--liquibase formatted sql
--changeset liquibase:keerthana.reddy@impactanalytics.com:fn_calculate_estimated_time_26112025 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_calculate_estimated_time

DROP FUNCTION IF EXISTS price_markdown_opt.fn_calculate_estimated_time(int4, text);

CREATE OR REPLACE FUNCTION price_markdown_opt.fn_calculate_estimated_time(_strategy_id integer, estimate_for text)
 RETURNS TABLE(time_in_mins integer, sku integer, store integer, pcd integer, discount integer)
 LANGUAGE plpgsql
AS $function$
    DECLARE
        mark_data RECORD;
        model_params RECORD;
        est_time_in_sec FLOAT;
        time_in_mins  INT;
        sku INT;
        store INT;
        pcd INT;
        discount INT;
    BEGIN
        IF _strategy_id not in (select strategy_id from price_markdown.tb_strategy_master) THEN
            RAISE EXCEPTION 'Strategy ID % not found in tb_strategy_master', _strategy_id;
        END IF;
        IF _strategy_id not in (select strategy_id from price_markdown.tb_strategy_sku_store_count where strategy_id = _strategy_id) THEN
            RAISE EXCEPTION 'Strategy ID % not found in tb_strategy_sku_store_count', _strategy_id;
        END IF;
        IF _strategy_id not in (select strategy_id from price_markdown.tb_strategy_pcd where strategy_id = _strategy_id) THEN
            RAISE EXCEPTION 'Strategy ID % not found in tb_strategy_pcd', _strategy_id;
        END IF;
        IF estimate_for not in ('Simulation', 'Optimization') THEN
            RAISE EXCEPTION 'estimate_for must be either Simulation or Optimization';
        END IF;

        -- Fetch data
        WITH base_tab AS(
            SELECT a.strategy_id, product_recommendation_level, store_recommendation_level, sku_count, store_count, pcd_count, 20 as discount_count
            FROM (select * from price_markdown.tb_strategy_master where strategy_id = _strategy_id) a
            JOIN (select * from price_markdown.tb_strategy_sku_store_count where strategy_id = _strategy_id) b
                ON a.strategy_id = b.strategy_id
            JOIN (SELECT strategy_id, COUNT(DISTINCT pcd_id) as pcd_count FROM price_markdown.tb_strategy_pcd where strategy_id = _strategy_id GROUP BY 1) c
                ON a.strategy_id = c.strategy_id
        )
        SELECT 
            -- Do the possible preprocessing here
            strategy_id,
            -- One-hot encoding for product_recommendation_level
            CASE WHEN product_recommendation_level = -200 THEN 1 ELSE 0 END as product_recommendation_level_minus_200,
            CASE WHEN product_recommendation_level = -100 THEN 1 ELSE 0 END as product_recommendation_level_minus_100,
            CASE WHEN product_recommendation_level = 0 THEN 1 ELSE 0 END as product_recommendation_level_0,
            CASE WHEN product_recommendation_level = 1 THEN 1 ELSE 0 END as product_recommendation_level_1,
            CASE WHEN product_recommendation_level = 2 THEN 1 ELSE 0 END as product_recommendation_level_2,
            CASE WHEN product_recommendation_level = 3 THEN 1 ELSE 0 END as product_recommendation_level_3,
            CASE WHEN product_recommendation_level = 4 THEN 1 ELSE 0 END as product_recommendation_level_4,
            CASE WHEN product_recommendation_level = 5 THEN 1 ELSE 0 END as product_recommendation_level_5,
            CASE WHEN product_recommendation_level = 6 THEN 1 ELSE 0 END as product_recommendation_level_6,
            CASE WHEN product_recommendation_level = 7 THEN 1 ELSE 0 END as product_recommendation_level_7,
            -- One-hot encoding for store_recommendation_level
            CASE WHEN store_recommendation_level = -200 THEN 1 ELSE 0 END as store_recommendation_level_minus_200,
            CASE WHEN store_recommendation_level = -100 THEN 1 ELSE 0 END as store_recommendation_level_minus_100,
            CASE WHEN store_recommendation_level = 0 THEN 1 ELSE 0 END as store_recommendation_level_0,
            CASE WHEN store_recommendation_level = 1 THEN 1 ELSE 0 END as store_recommendation_level_1,
            CASE WHEN store_recommendation_level = 2 THEN 1 ELSE 0 END as store_recommendation_level_2,
            CASE WHEN store_recommendation_level = 3 THEN 1 ELSE 0 END as store_recommendation_level_3,
            CASE WHEN store_recommendation_level = 4 THEN 1 ELSE 0 END as store_recommendation_level_4,
            CASE WHEN store_recommendation_level = 5 THEN 1 ELSE 0 END as store_recommendation_level_5,
            CASE WHEN store_recommendation_level = 6 THEN 1 ELSE 0 END as store_recommendation_level_6,
            CASE WHEN store_recommendation_level = 7 THEN 1 ELSE 0 END as store_recommendation_level_7,
            -- Log transformation of numerical columns
            LN(sku_count + 1) as log_sku_count,
            LN(store_count + 1) as log_store_count,
            LN(pcd_count + 1) as log_pcd_count,
            LN(discount_count + 1) as log_discount_count,
            -- Add below 4 columns only to return the values below are not used in the model
            sku_count as sku,
            store_count as store,
            pcd_count as pcd,
            discount_count as discount,
            product_recommendation_level,
            store_recommendation_level
            INTO mark_data
            FROM base_tab
            WHERE product_recommendation_level IS NOT NULL
                AND store_recommendation_level IS NOT NULL
                AND product_recommendation_level in (-100,-200,0,1,2,3,4,5,6,7)
                AND store_recommendation_level in (-100,-200,0,1,2,3,4,5,6,7)
                AND sku_count > 0
                AND store_count > 0
                AND pcd_count > 0
                AND discount_count > 0;

        IF mark_data IS NULL THEN
            RAISE EXCEPTION 'Strategy ID % not valid/found. - HINT: check filter conditions', _strategy_id;
        END IF;

        -- Fetch model parameters
        SELECT *
            INTO model_params
            FROM price_markdown_opt.tb_time_estimate_model_parameters
            WHERE model_name = estimate_for
                AND load_date = (
                    SELECT MAX(load_date) 
                    FROM price_markdown_opt.tb_time_estimate_model_parameters 
                    WHERE model_name = estimate_for
                );

        IF model_params IS NULL THEN
            RAISE EXCEPTION 'Model % is not found. - HINT: check model name', estimate_for;
        END IF;

        -- Calculate estimated time
        est_time_in_sec := (
            model_params.coeff_product_recommendation_level_minus_200 * mark_data.product_recommendation_level_minus_200 +
            model_params.coeff_product_recommendation_level_minus_100 * mark_data.product_recommendation_level_minus_100 +
            model_params.coeff_product_recommendation_level_1 * mark_data.product_recommendation_level_0 +
            model_params.coeff_product_recommendation_level_1 * mark_data.product_recommendation_level_1 +
            model_params.coeff_product_recommendation_level_2 * mark_data.product_recommendation_level_2 +
            model_params.coeff_product_recommendation_level_3 * mark_data.product_recommendation_level_3 +
            model_params.coeff_product_recommendation_level_4 * mark_data.product_recommendation_level_4 +
            model_params.coeff_product_recommendation_level_5 * mark_data.product_recommendation_level_5 +
            model_params.coeff_product_recommendation_level_6 * mark_data.product_recommendation_level_6 +
            model_params.coeff_product_recommendation_level_6 * mark_data.product_recommendation_level_7 +
            model_params.coeff_store_recommendation_level_minus_200 * mark_data.store_recommendation_level_minus_200 +
            model_params.coeff_store_recommendation_level_minus_100 * mark_data.store_recommendation_level_minus_100 +
            model_params.coeff_store_recommendation_level_1 * mark_data.store_recommendation_level_0 +
            model_params.coeff_store_recommendation_level_1 * mark_data.store_recommendation_level_1 +
            model_params.coeff_store_recommendation_level_2 * mark_data.store_recommendation_level_2 +
            model_params.coeff_store_recommendation_level_3 * mark_data.store_recommendation_level_3 +
            model_params.coeff_store_recommendation_level_4 * mark_data.store_recommendation_level_4 +
            model_params.coeff_store_recommendation_level_5 * mark_data.store_recommendation_level_5 +
            model_params.coeff_store_recommendation_level_6 * mark_data.store_recommendation_level_6 +
            model_params.coeff_store_recommendation_level_6 * mark_data.store_recommendation_level_7 +
            model_params.coeff_log_sku_count * mark_data.log_sku_count +
            model_params.coeff_log_store_count * mark_data.log_store_count +
            model_params.coeff_log_pcd_count * mark_data.log_pcd_count +
            model_params.coeff_log_discount_count * mark_data.log_discount_count +
            model_params.intercept
        );

        -- estimated time 
        est_time_in_sec := EXP(est_time_in_sec) - 1;

		-- Round to nearest minute with lower cap at 3 and upper cap at 5 minutes
		time_in_mins := LEAST(GREATEST(CEIL(GREATEST(est_time_in_sec, 30) / 60), 3), 7);
        
        -- Set the count values based on estimate_for
        IF estimate_for = 'Optimization' THEN
            sku := mark_data.sku;
            store := mark_data.store;
            pcd := mark_data.pcd;
            discount := mark_data.discount;
        ELSE
            sku := NULL;
            store := NULL;
            pcd := NULL;
            discount := NULL;
        END IF;
        
        -- Insert log into table
        INSERT INTO price_markdown_opt.tb_time_estimate_pred_log (
            model_name, strategy_id, product_recommendation_level, store_recommendation_level, sku_count, store_count, pcd_count, discount_count, pred_time_in_sec, return_query, load_date
        ) VALUES (
            estimate_for,
            _strategy_id,
            mark_data.product_recommendation_level,
            mark_data.store_recommendation_level,
            mark_data.sku,
            mark_data.store,
            mark_data.pcd,
            mark_data.discount,
            est_time_in_sec,
            'time_in_mins ' || time_in_mins::TEXT || ', sku ' || COALESCE(sku::TEXT, 'NULL') || ', store ' || COALESCE(store::TEXT, 'NULL') || ', pcd ' || COALESCE(pcd::TEXT, 'NULL') || ', discount ' || COALESCE(discount::TEXT, 'NULL'),
            NOW()
        );

        RETURN QUERY 
            SELECT time_in_mins::INT, sku, store, pcd, discount;
    END;
$function$
;