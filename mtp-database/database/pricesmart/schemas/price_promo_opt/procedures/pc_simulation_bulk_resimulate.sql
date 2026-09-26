--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_simulation_bulk_resimulate runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_simulation_bulk_resimulate

DROP PROCEDURE if exists price_promo_opt.pc_simulation_bulk_resimulate;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_simulation_bulk_resimulate(IN arr_promo_id integer[])
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE

    var_promo_id INTEGER;

    var_scenario_id INTEGER;

    row RECORD;

BEGIN

    -- Create or recreate the backup table once

    DROP TABLE IF EXISTS price_promo_opt_temp.ps_recommended_finalized_backup;

    CREATE TABLE price_promo_opt_temp.ps_recommended_finalized_backup AS

    SELECT *

    FROM price_promo.ps_recommended_finalized

    WHERE promo_id = ANY(arr_promo_id);



    -- Loop through each promo and scenario

    FOR row IN 

        SELECT DISTINCT promo_id, last_approved_scenario_id 

        FROM price_promo.promo_master 

        WHERE promo_id = ANY(arr_promo_id)

    LOOP

        var_promo_id := row.promo_id;

        var_scenario_id := row.last_approved_scenario_id;



        BEGIN

            -- Call the resimulation function

            PERFORM price_promo.fn_resimulate_driver_promo(var_promo_id, ARRAY[var_scenario_id]);



            -- Delete from finalized table

            DELETE FROM price_promo.ps_recommended_finalized 

            WHERE promo_id = var_promo_id 

            AND scenario_id = var_scenario_id;



            -- Insert into finalized table

            INSERT INTO price_promo.ps_recommended_finalized

            (event_id, promo_id, product_id, recommendation_date, s0_id, s1_id, discount_level_value, offer_type_id, offer_type_combined_display_name, effective_discount, original_price, original_cost, discounted_price, promo_spend, sales_units, baseline_sales_units, incremental_sales_units, sales_units_lift, revenue, baseline_revenue, incremental_revenue, revenue_lift, margin, baseline_margin, incremental_margin, margin_lift, aur, aum, affinity_revenue, cannibalization_revenue, pull_forward_revenue, affinity_margin, cannibalization_margin, pull_forward_margin, recommendation_type_id, created_by, updated_by, created_at, updated_at)

            SELECT 

                event_id, promo_id, product_id, recommendation_date, s0_id, s1_id, discount_level_value, offer_type_id, offer_type_combined_display_name, effective_discount, original_price, original_cost, discounted_price, promo_spend, sales_units, baseline_sales_units, incremental_sales_units, sales_units_lift, revenue, baseline_revenue, incremental_revenue, revenue_lift, margin, baseline_margin, incremental_margin, margin_lift, aur, aum, affinity_revenue, cannibalization_revenue, pull_forward_revenue, affinity_margin, cannibalization_margin, pull_forward_margin, recommendation_type_id, created_by, updated_by, created_at, updated_at

            FROM price_promo.ps_recommended_scenarios 

            WHERE promo_id = var_promo_id 

            AND scenario_id = var_scenario_id;



            -- Refresh aggregate table

            PERFORM price_promo.refresh_ps_recommended_finalized_agg(var_promo_id);
            CALL price_promo_opt.pc_update_auto_resimulated_flag(var_promo_id, 0);



        EXCEPTION

            WHEN OTHERS THEN

                -- Handle any exceptions by setting the flag

                CALL price_promo_opt.pc_update_auto_resimulated_flag(var_promo_id, -1);

        END;



    END LOOP;



END $procedure$



;