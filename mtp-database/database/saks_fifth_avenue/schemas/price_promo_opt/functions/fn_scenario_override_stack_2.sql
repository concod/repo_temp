--liquibase formatted sql
--changeset liquibase:fn_scenario_override_stack_2.1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_scenario_override_stack_2

DROP FUNCTION IF EXISTS price_promo_opt.fn_scenario_override_stack_2;

CREATE OR REPLACE FUNCTION price_promo_opt.fn_scenario_override_stack_2(_promo_id integer, _scenario_id integer, _multiplier numeric, _baseline_multiplier numeric, _user_id integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    _reference_table_normal TEXT;
    _reference_table_stack TEXT;
    _destination_table_normal TEXT;
    _destination_table_stack TEXT;
    _query TEXT;
    query_start_time TIMESTAMP;
    query_end_time TIMESTAMP;

BEGIN

	-- Operation Started
    RAISE NOTICE '%Running Non fin override', CHR(10);

	-- Determine reference and destination tables based on the scenario_id
    IF _scenario_id = 0 THEN
        _reference_table_normal := 'price_promo.ps_recommended_ia_projected';
        _reference_table_stack := 'price_promo.ps_recommended_stack_ia';
        _destination_table_normal := 'price_promo.ps_recommended_override_ia';
        _destination_table_stack := 'price_promo.ps_recommended_stack_override_ia';
    ELSE
        _reference_table_normal := 'price_promo.ps_recommended_scenarios';
        _reference_table_stack := 'price_promo.ps_recommended_scenarios_stack';
        _destination_table_normal := 'price_promo.ps_recommended_override';
        _destination_table_stack := 'price_promo.ps_recommended_scenarios_stack_override';
    END IF;

    -- Input validation
    IF _promo_id IS NULL OR _destination_table_normal IS NULL OR _destination_table_stack IS NULL THEN
        RAISE EXCEPTION 'Invalid inputs: promo_id or destination table names cannot be NULL';
    END IF;

    -- Record operation start time
    query_start_time := NOW();
    -- Delete existing records in destination tables
    IF _scenario_id = 0 THEN
        _query := format(
            'DELETE FROM %1$s WHERE promo_id = %3$s;
             DELETE FROM %2$s WHERE promo_id = %3$s;',
            _destination_table_normal,
            _destination_table_stack,
            _promo_id
        );
        EXECUTE _query;
    ELSE
        _query := format(
            'DELETE FROM %1$s WHERE scenario_id = %3$s;
             DELETE FROM %2$s WHERE scenario_id = %3$s;',
            _destination_table_normal,
            _destination_table_stack,
            _scenario_id
        );
        EXECUTE _query;
    END IF;

	query_end_time := NOW();
	RAISE NOTICE 'Query 1 duration: % seconds', query_end_time - query_start_time;



	query_start_time := NOW();
    -- Insert new records into the normal destination table
    _query := format('
        INSERT INTO %7$s (
            event_id, promo_id, %8$s product_id, recommendation_date, s0_id, s1_id,
            discount_level_value, offer_type_id,
            effective_discount, original_cost, discounted_price, promo_spend,
            sales_units, baseline_sales_units, incremental_sales_units,
            revenue, baseline_revenue, incremental_revenue, margin,
            baseline_margin, incremental_margin, affinity_units,
            cannibalization_units, pull_forward_units, affinity_revenue, cannibalization_revenue,
            pull_forward_revenue, affinity_margin, cannibalization_margin, pull_forward_margin,
            calculated_discount, created_by, updated_by,
            created_at, updated_at, contribution_revenue, contribution_margin
        )
        SELECT
            event_id, promo_id, %8$s product_id, recommendation_date, s0_id, s1_id,
            discount_level_value, offer_type_id,
            effective_discount, original_cost, discounted_price,
            promo_spend * %3$s AS promo_spend,
            sales_units * %3$s AS sales_units,
            baseline_sales_units * %4$s AS baseline_sales_units,
            (sales_units * %3$s) - (baseline_sales_units * %4$s) AS incremental_sales_units,
            revenue * %3$s AS revenue,
            baseline_revenue * %4$s AS baseline_revenue,
            (revenue * %3$s) - (baseline_revenue * %4$s) AS incremental_revenue,
            margin * %3$s AS margin,
            baseline_margin * %4$s AS baseline_margin,
            (margin * %3$s) - (baseline_margin * %4$s) AS incremental_margin,
            affinity_units * %3$s AS affinity_units,
            cannibalization_units * %3$s AS cannibalization_units,
            pull_forward_units * %3$s AS pull_forward_units,
            affinity_revenue * %3$s AS affinity_revenue,
            cannibalization_revenue * %3$s AS cannibalization_revenue,
            pull_forward_revenue * %3$s AS pull_forward_revenue,
            affinity_margin * %3$s AS affinity_margin,
            cannibalization_margin * %3$s AS cannibalization_margin,
            pull_forward_margin * %3$s AS pull_forward_margin,
            calculated_discount,
            %6$s AS created_by, null AS updated_by, NOW() AS created_at,
			NOW() AS updated_at,
            contribution_revenue * %3$s AS contribution_revenue,
            contribution_margin * %3$s AS contribution_margin
        FROM
            %5$s
        WHERE promo_id = %1$s %9$s;',
        _promo_id, _scenario_id, _multiplier, _baseline_multiplier,
        _reference_table_normal, _user_id, _destination_table_normal,
        CASE WHEN _scenario_id != 0 THEN 'scenario_id,' ELSE '' END,
        CASE WHEN _scenario_id != 0 THEN format('AND scenario_id = %1$s', _scenario_id) ELSE '' END
    );

    RAISE NOTICE 'Query 2: %', _query;
    EXECUTE _query;
   	query_end_time := NOW();
	RAISE NOTICE 'Query 2 duration: % seconds', query_end_time - query_start_time;



	query_start_time := NOW();
    -- Insert new records into the stack destination table
    _query := format('
        INSERT INTO %7$s (
            event_id, promo_id, %8$s product_id, recommendation_date, s0_id, s1_id,
            discount_level_value, offer_type_id,
            effective_discount, original_cost, discounted_price, promo_spend,
            sales_units, baseline_sales_units, incremental_sales_units,
            revenue, baseline_revenue, incremental_revenue, margin,
            baseline_margin, incremental_margin, affinity_units,
            cannibalization_units, pull_forward_units, affinity_revenue, cannibalization_revenue,
            pull_forward_revenue, affinity_margin, cannibalization_margin, pull_forward_margin,
            calculated_discount, created_by, updated_by,
            created_at, updated_at, contribution_revenue, contribution_margin
        )
        SELECT
            event_id, promo_id, %8$s product_id, recommendation_date, s0_id, s1_id,
            discount_level_value, offer_type_id,
            effective_discount, original_cost, discounted_price,
            promo_spend * %3$s AS promo_spend,
            sales_units * %3$s AS sales_units,
            baseline_sales_units * %4$s AS baseline_sales_units,
            (sales_units * %3$s) - (baseline_sales_units * %4$s) AS incremental_sales_units,
            revenue * %3$s AS revenue,
            baseline_revenue * %4$s AS baseline_revenue,
            (revenue * %3$s) - (baseline_revenue * %4$s) AS incremental_revenue,
            margin * %3$s AS margin,
            baseline_margin * %4$s AS baseline_margin,
            (margin * %3$s) - (baseline_margin * %4$s) AS incremental_margin,
            affinity_units * %3$s AS affinity_units,
            cannibalization_units * %3$s AS cannibalization_units,
            pull_forward_units * %3$s AS pull_forward_units,
            affinity_revenue * %3$s AS affinity_revenue,
            cannibalization_revenue * %3$s AS cannibalization_revenue,
            pull_forward_revenue * %3$s AS pull_forward_revenue,
            affinity_margin * %3$s AS affinity_margin,
            cannibalization_margin * %3$s AS cannibalization_margin,
            pull_forward_margin * %3$s AS pull_forward_margin,
            calculated_discount,
            %6$s AS created_by, null AS updated_by, NOW() AS created_at,
            NOW() AS updated_at,
            contribution_revenue * %3$s AS contribution_revenue,
            contribution_margin * %3$s AS contribution_margin
        FROM
            %5$s
        WHERE promo_id = %1$s %9$s;',
        _promo_id, _scenario_id, _multiplier, _baseline_multiplier,
        _reference_table_stack, _user_id, _destination_table_stack,
        CASE WHEN _scenario_id != 0 THEN 'scenario_id,' ELSE '' END,
        CASE WHEN _scenario_id != 0 THEN format('AND scenario_id = %1$s', _scenario_id) ELSE '' END
    );

    RAISE NOTICE 'Query 3: %', _query;
   	EXECUTE _query;
	query_end_time := NOW();
	RAISE NOTICE 'Query 3 duration: % seconds', query_end_time - query_start_time;


    -- Refresh aggregate tables
    IF _scenario_id = 0 THEN
        CALL price_promo_opt.pc_promo_refresh_ia_agg_v1(array[_promo_id],
        ARRAY['ps_recommended_override_ia', 'ps_recommended_stack_override_ia']);
    ELSE
        CALL price_promo_opt.pc_promo_refresh_scenario_agg_v1(array[_promo_id], array[_scenario_id],
        ARRAY['ps_recommended_override', 'ps_recommended_scenarios_stack_override']);
    END IF;
    -- Operation completed
    RAISE NOTICE 'Completed inserting for promo_id: %, scenario_id: %', _promo_id, _scenario_id;

END;
$function$
;
