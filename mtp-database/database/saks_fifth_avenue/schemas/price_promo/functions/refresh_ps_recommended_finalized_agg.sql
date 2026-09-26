--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:refresh_ps_recommended_finalized_agg_v291124 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for refresh_ps_recommended_finalized_agg_v3

DROP FUNCTION IF EXISTS price_promo.refresh_ps_recommended_finalized_agg;
CREATE OR REPLACE FUNCTION price_promo.refresh_ps_recommended_finalized_agg(p_promo_id integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    table_name TEXT;
    non_partition_table_name TEXT;
    where_clause TEXT;
    v_last_approved_scenario_id INTEGER;
BEGIN
    -- Determine the table name based on recommendation type
    IF (SELECT recommendation_type_id FROM price_promo.promo_master WHERE promo_id = p_promo_id) = 31 THEN
        -- Optimize path
        table_name := 'price_promo.ps_recommended_ia_projected';
        where_clause := format('WHERE promo_id = %s', p_promo_id);
        non_partition_table_name := 'price_promo.ps_recommended_ia_projected_agg';
	v_last_approved_scenario_id:=0;

    ELSE
        -- Resimulation path
        table_name := 'price_promo.ps_recommended_scenarios';

        -- Get the last approved scenario ID
        SELECT last_approved_scenario_id INTO v_last_approved_scenario_id
        FROM price_promo.promo_master
        WHERE promo_id = p_promo_id;

        where_clause := format(
            'WHERE promo_id = %s AND scenario_id = %s',
            p_promo_id,
            v_last_approved_scenario_id
        );
        non_partition_table_name := 'price_promo.ps_recommended_scenarios_agg';
    END IF;

		IF v_last_approved_scenario_id IS NULL THEN
		    RAISE EXCEPTION 'No approved scenario found for promo_id: %', p_promo_id;
		END IF;

    -- Clear existing entries in the final aggregation table for this promo_id
    EXECUTE format(
        'DELETE FROM price_promo.ps_recommended_finalized_agg
         WHERE promo_id = %s',
        p_promo_id
    );

    -- Insert new aggregated data based on the selected path
    EXECUTE format(
        'INSERT INTO price_promo.ps_recommended_finalized_agg (
            event_id, promo_id, recommendation_date, discount_level_value,
            offer_type_combined_display_name, effective_discount,
            original_cost, discounted_price, promo_spend, sales_units,
            baseline_sales_units, incremental_sales_units, revenue,
            baseline_revenue, incremental_revenue, margin, baseline_margin,
            incremental_margin, aur, aum, affinity_revenue,
            cannibalization_revenue, pull_forward_revenue, affinity_margin,
            cannibalization_margin, pull_forward_margin, recommendation_type_id,
            created_by, updated_by, created_at, updated_at,
			contribution_margin,
			contribution_revenue
        )
        SELECT
            event_id, promo_id, recommendation_date, discount_level_value,
            offer_type_combined_display_name, effective_discount,
            original_cost, discounted_price, promo_spend, sales_units,
            baseline_sales_units, incremental_sales_units, revenue,
            baseline_revenue, incremental_revenue, margin, baseline_margin,
            incremental_margin, aur, aum, affinity_revenue,
            cannibalization_revenue, pull_forward_revenue, affinity_margin,
            cannibalization_margin, pull_forward_margin, recommendation_type_id,
            created_by, updated_by, created_at, updated_at,
			contribution_margin,
			contribution_revenue
        FROM %s
        %s',
        non_partition_table_name,
        where_clause
    );
raise NOTICE 'select * from %   %', non_partition_table_name, where_clause;

EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'An error occurred during execution: %', SQLERRM;
        -- Optionally, handle specific errors or rollback
END
$function$
;