--liquibase formatted sql
--changeset hareeshwar.c@impactanalytics.co:fn_finalize_promo_recommendations_4 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: modified fn to include override features for fn_finalize_promo_recommendations


DROP FUNCTION IF EXISTS price_promo.fn_finalize_promo_recommendations;

-- DROP FUNCTION price_promo.fn_finalize_promo_recommendations(int4, int4);

CREATE OR REPLACE FUNCTION price_promo.fn_finalize_promo_recommendations(
    p_promo_id integer,
    p_user_id integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    table_name TEXT;
    partition_table_name TEXT;
    non_partition_table_name TEXT;
    where_clause TEXT;
    v_last_approved_scenario_id INTEGER;
    v_is_default BOOLEAN;
BEGIN
    -- Get the last_approved_scenario_id for non-IA recommendations
    SELECT last_approved_scenario_id INTO v_last_approved_scenario_id
    FROM price_promo.promo_master
    WHERE promo_id = p_promo_id;

    -- Check if there is an entry in tb_promo_override_forecast with is_default = true
    SELECT is_default INTO v_is_default
    FROM price_promo.tb_promo_override_forecast
    WHERE promo_id = p_promo_id
    AND scenario_id = v_last_approved_scenario_id
    LIMIT 1;

    -- Determine the table name and where clause based on recommendation type and is_default flag
    IF (SELECT recommendation_type_id FROM price_promo.promo_master WHERE promo_id = p_promo_id) = 31 THEN
        -- IA Projected
        IF v_is_default THEN
            table_name := 'price_promo.ps_recommended_override_ia';
            where_clause := format('WHERE promo_id = %s', p_promo_id);
            partition_table_name := format('price_promo.ps_recommended_override_ia_%s', p_promo_id);

            -- Set is_overridden_scenario_finalized to true in promo_master
            UPDATE price_promo.promo_master
            SET is_overridden_scenario_finalized = true,
            	status = 4,
                updated_at = now(),
                updated_by = p_user_id
            WHERE promo_id = p_promo_id;
           	non_partition_table_name := 'price_promo.ps_recommended_override_ia_agg';
        ELSE
            table_name := 'price_promo.ps_recommended_ia_projected';
            where_clause := format('WHERE promo_id = %s', p_promo_id);
            partition_table_name := format('price_promo.ps_recommended_ia_projected_%s', p_promo_id);

            UPDATE price_promo.promo_master
            SET is_overridden_scenario_finalized = false,
                status = 4,
                updated_at = now(),
                updated_by = p_user_id
            WHERE promo_id = p_promo_id;
           	non_partition_table_name := 'price_promo.ps_recommended_ia_projected_agg';
        END IF;
    ELSE
        -- Scenarios (Resimulation)
        IF v_is_default THEN
            table_name := 'price_promo.ps_recommended_override';
            where_clause := format('WHERE promo_id = %s AND scenario_id = %s', p_promo_id, v_last_approved_scenario_id);
            partition_table_name := format('price_promo.ps_recommended_override_%s', v_last_approved_scenario_id);

           	-- Set is_overridden_scenario_finalized to true in promo_master
            UPDATE price_promo.promo_master
            SET is_overridden_scenario_finalized = true,
            	status = 4,
                updated_at = now(),
                updated_by = p_user_id
            WHERE promo_id = p_promo_id;
           	non_partition_table_name := 'price_promo.ps_recommended_override_agg';
        ELSE
            table_name := 'price_promo.ps_recommended_scenarios';
            where_clause := format('WHERE promo_id = %s AND scenario_id = %s', p_promo_id, v_last_approved_scenario_id);
            partition_table_name := format('price_promo.ps_recommended_scenarios_%s', v_last_approved_scenario_id);

            UPDATE price_promo.promo_master
            SET is_overridden_scenario_finalized = false,
                status = 4,
                updated_at = now(),
                updated_by = p_user_id
            WHERE promo_id = p_promo_id;
           	non_partition_table_name := 'price_promo.ps_recommended_scenarios_agg';
        END IF;
    END IF;

    -- Delete from ps_recommended_finalized
    EXECUTE format(
        'DELETE FROM price_promo.ps_recommended_finalized
         WHERE promo_id = %s',
        p_promo_id
    );

    -- Delete from ps_recommended_finalized_agg
    EXECUTE format(
        'DELETE FROM price_promo.ps_recommended_finalized_agg
         WHERE promo_id = %s',
        p_promo_id
    );

    -- Call procedure to create finalized table partitions
    CALL price_promo.pc_simulation_create_finalized_table_partitions(ARRAY[p_promo_id]);

    -- Insert into ps_recommended_finalized using dynamic table name and WHERE clause
    EXECUTE format(
        'INSERT INTO price_promo.ps_recommended_finalized (
            event_id,
            promo_id,
            product_id,
            recommendation_date,
            s0_id,
            s1_id,
            discount_level_value,
            offer_type_id,
            offer_type_combined_display_name,
            effective_discount,
            original_price,
            original_cost,
            discounted_price,
            promo_spend,
            sales_units,
            baseline_sales_units,
            incremental_sales_units,
            sales_units_lift,
            revenue,
            baseline_revenue,
            incremental_revenue,
            revenue_lift,
            margin,
            baseline_margin,
            incremental_margin,
            margin_lift,
            aur,
            aum,
            affinity_revenue,
            cannibalization_revenue,
            pull_forward_revenue,
            affinity_margin,
            cannibalization_margin,
            pull_forward_margin,
            recommendation_type_id,
            contribution_revenue,
			contribution_margin,
            created_by,
            updated_by,
            created_at,
            updated_at
        )
        SELECT
            event_id,
            promo_id,
            product_id,
            recommendation_date,
            s0_id,
            s1_id,
            discount_level_value,
            offer_type_id,
            offer_type_combined_display_name,
            effective_discount,
            original_price,
            original_cost,
            discounted_price,
            promo_spend,
            sales_units,
            baseline_sales_units,
            incremental_sales_units,
            sales_units_lift,
            revenue,
            baseline_revenue,
            incremental_revenue,
            revenue_lift,
            margin,
            baseline_margin,
            incremental_margin,
            margin_lift,
            aur,
            aum,
            affinity_revenue,
            cannibalization_revenue,
            pull_forward_revenue,
            affinity_margin,
            cannibalization_margin,
            pull_forward_margin,
            recommendation_type_id,
            contribution_revenue,
			contribution_margin,
            created_by,
            updated_by,
            created_at,
            updated_at
        FROM %s
        %s',
        partition_table_name,
        where_clause
    );

    -- Insert into ps_recommended_finalized_agg using non-partition table name and WHERE clause
    EXECUTE format(
        'INSERT INTO price_promo.ps_recommended_finalized_agg (
            event_id,
            promo_id,
            recommendation_date,
            discount_level_value,
            offer_type_combined_display_name,
            effective_discount,
            original_price,
            original_cost,
            discounted_price,
            promo_spend,
            sales_units,
            baseline_sales_units,
            incremental_sales_units,
            sales_units_lift,
            revenue,
            baseline_revenue,
            incremental_revenue,
            revenue_lift,
            margin,
            baseline_margin,
            incremental_margin,
            margin_lift,
            aur,
            aum,
            affinity_revenue,
            cannibalization_revenue,
            pull_forward_revenue,
            affinity_margin,
            cannibalization_margin,
            pull_forward_margin,
            recommendation_type_id,
            contribution_revenue,
			contribution_margin,
            created_by,
            updated_by,
            created_at,
            updated_at
        )
        SELECT
            event_id,
            promo_id,
            recommendation_date,
            discount_level_value,
            offer_type_combined_display_name,
            effective_discount,
            original_price,
            original_cost,
            discounted_price,
            promo_spend,
            sales_units,
            baseline_sales_units,
            incremental_sales_units,
            sales_units_lift,
            revenue,
            baseline_revenue,
            incremental_revenue,
            revenue_lift,
            margin,
            baseline_margin,
            incremental_margin,
            margin_lift,
            aur,
            aum,
            affinity_revenue,
            cannibalization_revenue,
            pull_forward_revenue,
            affinity_margin,
            cannibalization_margin,
            pull_forward_margin,
            recommendation_type_id,
            contribution_revenue,
			contribution_margin,
            created_by,
            updated_by,
            created_at,
            updated_at
        FROM %s
        %s',
        non_partition_table_name,
        where_clause
    );
END;
$function$
;
