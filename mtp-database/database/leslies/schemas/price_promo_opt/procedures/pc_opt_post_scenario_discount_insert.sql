--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_opt_post_scenario_discount_insert runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_opt_post_scenario_discount_insert

DROP PROCEDURE IF EXISTS price_promo_opt.pc_opt_post_scenario_discount_insert ;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_opt_post_scenario_discount_insert(IN var_promo_id integer, IN arr_speed_id integer[])
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE

    var_start_date DATE;

    var_end_date DATE;

    var_week_start_date DATE;

    var_week_end_date DATE;

    query VARCHAR;

    table_suffix VARCHAR;

BEGIN

    -- Generate a unique table suffix

    table_suffix := format('%s_%s', var_promo_id, array_to_string(arr_speed_id, '_'));



    -- Log execution time

    RAISE NOTICE 'time_1_%', clock_timestamp();



    -- Fetch promo details

    SELECT start_date, end_date, week_start_date, week_end_date 

    INTO var_start_date, var_end_date, var_week_start_date, var_week_end_date

    FROM price_promo_opt.fn_get_promo_details(var_promo_id);



    -- Delete existing scenario discounts

    DELETE FROM price_promo.ia_ps_scenario_discounts WHERE promo_id = var_promo_id;



    -- Construct dynamic query for updating scenario discounts

    query := format(

        '

        UPDATE price_promo.ps_scenario_discounts psd

        SET ia_recommended_data = subquery.ia_recommended_data

        FROM (

            SELECT DISTINCT

                promo_id, discount_level_value,

                jsonb_build_object(

                    ''0'', jsonb_build_object(

                        ''scenario_id'', 0,

                        ''created_at'', now(),

                        ''scenario_type'', ''ia_recommended'',

                        ''scenario_order_id'', 0,

                        ''offer_type_id'', offer_type_id,

                        ''offer_type'', offer_type,

                        ''offer_x_type'', offer_x_type,

                        ''offer_x_value'', offer_x_value,

                        ''offer_y_type'', offer_y_type,

                        ''offer_y_value'', offer_y_value,

                        ''offer_z_type'', offer_z_type,

                        ''offer_z_value'', offer_z_value,

                        ''tier_id'', NULL

                    )

                ) AS ia_recommended_data

            FROM (

                SELECT 

                    promo_id, 

                    TRIM(opt_level_bins::varchar) AS discount_level_value, 

                    opt_discount_type_id AS offer_type_id, 

                    TRIM(offer_type) AS offer_type,

                    offer_x_value, TRIM(offer_x_type) AS offer_x_type, 

                    offer_y_value, TRIM(offer_y_type) AS offer_y_type, 

                    offer_z_value, TRIM(offer_z_type) AS offer_z_type,

                    price_promo.get_offer_description(

                        discount_level::INTEGER, TRIM(offer_type)::VARCHAR, 

                        offer_x_value::NUMERIC, TRIM(offer_x_type)::VARCHAR, 

                        offer_y_value::NUMERIC, TRIM(offer_y_type)::VARCHAR, 

                        offer_z_value::NUMERIC

                    ) AS offer_type_combined_display_name, 

                    created_by, created_at

                FROM public.gurobi_output_result_%s subq

                LEFT JOIN price_promo.master_valid_offers mv

                   USING(offer_identifier, offer_type)

                LEFT JOIN price_promo_opt.fn_get_rules_data(%s) rule_data

                    USING (offer_type)

            ) subquery

        ) subquery

        WHERE psd.promo_id = subquery.promo_id

        AND TRIM(subquery.discount_level_value) =  CONCAT(product_level_id, ''_'', store_level_id, ''_'', COALESCE(customer_level_id,0));

        ', 

        table_suffix, var_promo_id

    );



    -- Print query for debugging

    RAISE NOTICE '%', query;



    -- Execute the constructed query

    EXECUTE query;



END;

$procedure$
;
