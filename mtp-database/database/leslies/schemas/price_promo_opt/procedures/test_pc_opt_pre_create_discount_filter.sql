--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:test_pc_opt_pre_create_discount_filter runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for test_pc_opt_pre_create_discount_filter

DROP PROCEDURE IF EXISTS price_promo_opt.test_pc_opt_pre_create_discount_filter ;
CREATE OR REPLACE PROCEDURE price_promo_opt.test_pc_opt_pre_create_discount_filter(IN var_promo_id integer, IN var_speed_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE

    query varchar;

    temp_table_name varchar;

    start_time timestamp;

    end_time timestamp;

BEGIN

    -- Record start time for performance measurement

    start_time := clock_timestamp();



    -- Set the temporary table name

    temp_table_name := format('price_promo_opt_temp.promo_opt_pre_discount_filter_%s_%s', var_promo_id, var_speed_id);



    -- Main query construction

    query := format('

        DROP TABLE IF EXISTS %1$s;

        CREATE UNLOGGED TABLE %1$s AS (

            -- Step 1: Get promotion date range

            WITH date_range AS (

                SELECT DISTINCT 

                    date_id AS date,

                    week_start_date

                FROM 

                    (SELECT start_date, end_date 

                     FROM price_promo.promo_master 

                     WHERE promo_id = %2$s) pm

                INNER JOIN

                    (SELECT date_id, weeks_start_date AS week_start_date

                     FROM global.tb_fiscal_date_mapping) fdm

                ON fdm.date_id BETWEEN pm.start_date AND pm.end_date

            ),



            -- Step 2: Get base discount information

            base_discounts AS (

                SELECT 

                    pd.promo_id,

                    pd.product_level_id,

                    pd.store_level_id,

                    pd.customer_level_id,

                    mo.offer_type,

                    mo.opt_discount_type_id AS offer_type_id,

                    mo.offer_x_value,

                    mo.offer_y_value,

                    mo.offer_z_value,

                    mo.offer_x_type,

                    mo.offer_y_type,

                    mo.offer_z_type,

                    mo.discount_filter,

                    1 as tiered_offer_indicator,

                    1 as max_tier

                FROM price_promo.ps_scenario_discounts pd

                LEFT JOIN (

                    SELECT *

                    FROM price_promo.master_valid_offers

                    INNER JOIN price_promo_opt.fn_get_rules_data(%2$s) USING(offer_type)

                    WHERE (discount_filter BETWEEN min_discount AND max_discount)

                    OR (discount_filter = any(

                        CASE 

                            WHEN discount_type_values::integer[] is NULL 

                            THEN ARRAY[]::integer[]

                            ELSE discount_type_values::integer[] 

                        END))

                ) mo ON true

                WHERE pd.promo_id = %2$s

            ),



            -- Step 3: Join with product and store details

            enriched_discounts AS (

                SELECT 

                    bd.*,

                    COALESCE(p.product_id, 0) as product_id,

                    COALESCE(s.store_id, 0) as store_id,

                    COALESCE(c.customer_id, 0) as customer_id,

                    sm.s0_id, sm.s1_id, sm.s2_id, sm.s3_id, sm.s4_id, sm.s5_id,

                    p.product_level_value->>''pg_id''::integer AS product_pg_id,

                    s.store_level_value->>''pg_id''::integer AS store_pg_id

                FROM base_discounts bd

                LEFT JOIN price_promo.tb_promo_product_reco_details p 

                    ON bd.promo_id = p.promo_id 

                    AND bd.product_level_id = p.product_level_id

                LEFT JOIN price_promo.tb_promo_store_reco_details s 

                    ON bd.promo_id = s.promo_id 

                    AND bd.store_level_id = s.store_level_id

                LEFT JOIN price_promo.tb_promo_customer_reco_details c 

                    ON bd.promo_id = c.promo_id 

                    AND bd.customer_level_id = c.customer_level_id

                LEFT JOIN global.tb_store_master sm 

                    ON s.store_id = sm.store_id

            ),



            -- Step 4: Calculate discounts

            calculated_discounts AS (

                SELECT 

                    ed.*,

                    pf.*,

                    CASE

                        WHEN offer_type = ''percent_off'' THEN offer_x_value

                        WHEN offer_type = ''extra_amount_off'' THEN ((offer_x_value / current_price) * 100)

                        WHEN offer_type = ''fixed_price'' THEN (((current_price - offer_x_value) / current_price) * 100)

                        WHEN offer_type = ''bxgy_percent_off'' THEN ((offer_z_value * 0.01 * offer_y_value) / (offer_y_value + offer_x_value)) * 100

                        WHEN offer_type = ''bxgy'' THEN ((offer_y_value / (offer_y_value + offer_x_value)) * 100)

                        WHEN offer_type = ''bmsm'' AND offer_x_type = ''dollar'' AND offer_y_type = ''percent_off'' THEN offer_y_value

                        WHEN offer_type = ''bmsm'' AND offer_x_type = ''unit'' AND offer_y_type = ''percent_off'' THEN offer_y_value

                        WHEN offer_type = ''bmsm'' AND offer_x_type = ''dollar'' AND offer_y_type = ''dollar_off'' THEN ((offer_y_value / offer_x_value) * 100)

                        WHEN offer_type = ''bmsm'' AND offer_x_type = ''unit'' AND offer_y_type = ''dollar_off'' THEN ((offer_y_value / (offer_x_value * current_price)) * 100)

                        WHEN offer_type = ''bmsm'' AND offer_x_type = ''unit'' AND offer_y_type = ''at_dollar'' THEN (((current_price - (offer_y_value / offer_x_value)) / current_price) * 100)

                    END AS calculated_discount

                FROM enriched_discounts ed

                INNER JOIN price_promo_opt_temp.promo_product_filter_resim_%2$s_%3$s pf 

                    ON ed.product_id = pf.product_id

            )



            -- Final output with all calculations

            SELECT 

                cd.*,

                dr.date,

                dr.week_start_date,

                ROUND(calculated_discount::numeric, 2) AS final_discount,

                CASE

                    WHEN calculated_discount >= 95 THEN 95

                    ELSE FLOOR(calculated_discount / 5) * 5 + 

                         CASE WHEN calculated_discount::numeric %% 5 >= 2.5 THEN 5 ELSE 0 END

                END::integer AS base_percentage

            FROM calculated_discounts cd

            CROSS JOIN date_range dr

        );



        -- Create indexes for performance

        CREATE INDEX ON %1$s (l3_cid, brand_cid, s1_id);

        CREATE INDEX ON %1$s (product_id, base_percentage);

    ',

    temp_table_name,    -- %1$s

    var_promo_id,       -- %2$s

    var_speed_id        -- %3$s

    );



    -- Execute the query

    EXECUTE query;



    -- Call dependent procedures

    CALL price_promo_opt.pc_opt_pre_create_discount_filter_finalized_stack_v1_2403202(

        var_promo_id, 

        array[var_speed_id]

    );



    CALL price_promo_opt.generate_promo_scenario_report_stack_v1_24032025(

        temp_table_name, 

        format('price_promo_opt_temp.simulation_stacked_discounts_table_%s_%s',

            var_promo_id, 

            var_speed_id

        )

    );



    -- Record end time and log duration

    end_time := clock_timestamp();

    RAISE NOTICE 'Execution time: % milliseconds', 

        EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;



END;

$procedure$
;
