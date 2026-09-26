--liquibase formatted sql
--changeset liquibase:fn_scenario_override_stack_3_1.1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_scenario_override_stack_3_1

DROP FUNCTION IF EXISTS price_promo_opt.fn_scenario_override_stack_3_1;

CREATE OR REPLACE FUNCTION price_promo_opt.fn_scenario_override_stack_3_1(_promo_id integer, _scenario_id integer, _multiplier numeric, _baseline_multiplier numeric, _user_id integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    _reference_table_normal TEXT;
    _reference_table_stack TEXT;
    _destination_table_normal TEXT;
    _destination_table_stack TEXT;
    _finalized_normal TEXT;
    _finalized_normal_override TEXT;
    _finalized_stack TEXT;
    _finalized_stack_override TEXT;
    _min_start_date DATE;
    _max_start_date DATE;
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    vl_test_query TEXT;
    _query TEXT;
begin

	RAISE NOTICE '%Function to delete from Review promo (Finalized and Scenario tables)', CHR(10);


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

   	-- Define finalized and scenario tables
	_finalized_normal := 'price_promo.ps_recommended_finalized';
	_finalized_normal_override := 'price_promo.ps_recommended_finalized_override';
	_finalized_stack := 'price_promo.ps_recommended_finalized_stack';
	_finalized_stack_override := 'price_promo.ps_recommended_finalized_stack_override';

	start_time := NOW();
	-- Delete existing records in destination tables
	IF _scenario_id = 0 THEN
	    _query := format(
	        'DELETE FROM %1$s WHERE promo_id = %5$s;
	         DELETE FROM %2$s WHERE promo_id = %5$s;
	         DELETE FROM %3$s WHERE promo_id = %5$s;
	         DELETE FROM %4$s WHERE promo_ids @> ARRAY[%5$s]::int4[];',
	        _destination_table_normal,
	        _destination_table_stack,
	        _finalized_normal_override,
	        _finalized_stack_override,
	        _promo_id
	    );
	    EXECUTE _query;
	ELSE
	    _query := format(
	        'DELETE FROM %1$s WHERE scenario_id = %5$s;
	         DELETE FROM %2$s WHERE scenario_id = %5$s;
	         DELETE FROM %3$s WHERE promo_id = %6$s;
	         DELETE FROM %4$s WHERE promo_ids @> ARRAY[%6$s]::int4[];',
	        _destination_table_normal,
	        _destination_table_stack,
	        _finalized_normal_override,
	        _finalized_stack_override,
	        _scenario_id, _promo_id
	    );
	    EXECUTE _query;
	END IF;

    end_time := NOW();
    RAISE NOTICE 'Deleted records for promo_id: %, scenario_id: %, duration: % seconds',
        _promo_id, _scenario_id, EXTRACT(SECOND FROM (end_time - start_time));

     start_time := NOW();
     -- Insert new records into the normal destination table (Scenario Override)
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
            %6$s AS created_by, null AS updated_by, NOW() AS created_at, NOW() AS updated_at,
            contribution_revenue * %3$s AS contribution_revenue,
            contribution_margin * %3$s AS contribution_margin
        FROM
            %5$s
        WHERE promo_id = %1$s %9$s',
        _promo_id, _scenario_id, _multiplier, _baseline_multiplier,
        _reference_table_normal, _user_id, _destination_table_normal,
        CASE WHEN _scenario_id != 0 THEN 'scenario_id,' ELSE '' END,
        CASE WHEN _scenario_id != 0 THEN format('AND scenario_id = %1$s', _scenario_id) ELSE '' END
    );

    RAISE NOTICE 'Query 1: %', _query;
    EXECUTE _query;
    RAISE NOTICE 'Query 1 duration: % seconds', EXTRACT(SECOND FROM NOW() - start_time);


    start_time := NOW();
    -- Insert new records into the Scenario stack destination table (Scenario Stack Override)
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
            %6$s AS created_by, null AS updated_by, NOW() AS created_at, NOW() AS updated_at,
            contribution_revenue * %3$s AS contribution_revenue,
            contribution_margin * %3$s AS contribution_margin
        FROM
            %5$s
        WHERE promo_id = %1$s %9$s',
        _promo_id, _scenario_id, _multiplier, _baseline_multiplier,
        _reference_table_stack, _user_id, _destination_table_stack,
        CASE WHEN _scenario_id != 0 THEN 'scenario_id,' ELSE '' END,
        CASE WHEN _scenario_id != 0 THEN format('AND scenario_id = %1$s', _scenario_id) ELSE '' END
    );

    RAISE NOTICE 'Query 2: %', _query;
    EXECUTE _query;
   	RAISE NOTICE 'Query 2 duration: % seconds', EXTRACT(SECOND FROM NOW() - start_time);


    start_time := NOW();
    ---------------Insert into Finalized Override table
    _query := format('
    INSERT INTO %7$s (
        event_id, promo_id, product_id, recommendation_date, s0_id, s1_id, discount_level_value,
        offer_type_id, effective_discount,
        original_cost, discounted_price, promo_spend, sales_units, baseline_sales_units,
        incremental_sales_units, revenue, baseline_revenue, incremental_revenue,
        margin, baseline_margin, incremental_margin,
        affinity_revenue, cannibalization_revenue, pull_forward_revenue, affinity_margin,
        cannibalization_margin, pull_forward_margin, created_by, updated_by, created_at, updated_at,
        contribution_revenue, contribution_margin
    )
    SELECT
        event_id, promo_id, product_id, recommendation_date, s0_id, s1_id, discount_level_value,
        offer_type_id, effective_discount,
        original_cost, discounted_price, promo_spend * %3$s,
		sales_units * %3$s, baseline_sales_units * %4$s, (sales_units * %3$s) - (baseline_sales_units * %4$s),
		revenue * %3$s, baseline_revenue * %4$s, (revenue * %3$s) - (baseline_revenue * %4$s),
        margin * %3$s, baseline_margin * %4$s, (margin * %3$s) - (baseline_margin * %4$s),
		affinity_revenue * %3$s, cannibalization_revenue * %3$s, pull_forward_revenue * %3$s,
		affinity_margin * %3$s, cannibalization_margin * %3$s, pull_forward_margin * %3$s,
		%6$s, null, NOW(), NOW(),
        contribution_revenue * %3$s, contribution_margin * %3$s
    FROM %5$s
    WHERE promo_id = %1$s',
    _promo_id, _scenario_id, _multiplier, _baseline_multiplier, _finalized_normal,
    _user_id, _finalized_normal_override
	);

	RAISE NOTICE 'Query 3: %', _query;
	EXECUTE _query;
	RAISE NOTICE 'Query 3 duration: % seconds', EXTRACT(SECOND FROM NOW() - start_time);



    start_time := NOW();
	------------- Insert into Finalized Stack Override table.
	_query := format('
	    INSERT INTO %7$s (
	        event_id, promo_ids, product_id, recommendation_date, s0_id, s1_id, discount_level_value,
	        offer_type_id, effective_discount,
	        original_cost, discounted_price, promo_spend, sales_units, baseline_sales_units,
	        incremental_sales_units,  revenue, baseline_revenue, incremental_revenue,
	         margin, baseline_margin, incremental_margin,
	        affinity_revenue, cannibalization_revenue, pull_forward_revenue, affinity_margin,
	        cannibalization_margin, pull_forward_margin, created_by, updated_by,
	        created_at, updated_at, contribution_revenue, contribution_margin, pos_baseline_sales_units,
			pos_baseline_revenue, pos_baseline_margin
	    )
	    SELECT
	        event_id, promo_ids, product_id, recommendation_date, s0_id, s1_id, discount_level_value,
	        offer_type_id, effective_discount,
	        original_cost, discounted_price, promo_spend * %3$s,
	        sales_units * %3$s, baseline_sales_units * %4$s,
	        (sales_units * %3$s) - (baseline_sales_units * %4$s),
	        revenue * %3$s, baseline_revenue * %4$s,
	        (revenue * %3$s) - (baseline_revenue * %4$s),
	        margin * %3$s, baseline_margin * %4$s,
	        (margin * %3$s) - (baseline_margin * %4$s),
	        affinity_revenue * %3$s, cannibalization_revenue * %3$s, pull_forward_revenue * %3$s,
	        affinity_margin * %3$s, cannibalization_margin * %3$s, pull_forward_margin * %3$s,
	        %6$s AS created_by, NULL AS updated_by,
	        NOW() AS created_at, NOW() AS updated_at,
	        contribution_revenue * %3$s, contribution_margin * %3$s,
			pos_baseline_sales_units * %3$s,
			pos_baseline_revenue * %3$s, pos_baseline_margin * %3$s
	    FROM %5$s
	    WHERE promo_ids @> ARRAY[%1$s]::int4[]',
	    _promo_id,          -- %1$s: Promo ID for filtering
	    _scenario_id,       -- %2$s: Scenario ID (not used in this query but available for context)
	    _multiplier,        -- %3$s: Multiplier for scaling
	    _baseline_multiplier, -- %4$s: Baseline multiplier for scaling
	    _finalized_stack,   -- %5$s: Source table name
	    _user_id,           -- %6$s: User ID for created_by
	    _finalized_stack_override -- %7$s: Destination table name
	);

	RAISE NOTICE 'Query 4: %', _query;
	EXECUTE _query;
	RAISE NOTICE 'Query 4 duration: % seconds', EXTRACT(SECOND FROM NOW() - start_time);


	-------------------- Refresh AGG tables
	IF _scenario_id = 0 THEN
	    CALL price_promo_opt.pc_promo_refresh_ia_agg_v1(ARRAY[_promo_id], ARRAY[ 'ps_recommended_override_ia', 'ps_recommended_stack_override_ia']);
	   	CALL price_promo_opt.pc_promo_refresh_fin_agg_v1(ARRAY[_promo_id],ARRAY['ps_recommended_finalized_override', 'ps_recommended_finalized_stack_override']);

	ELSE
	    CALL price_promo_opt.pc_promo_refresh_scenario_agg_v1(ARRAY[_promo_id], ARRAY[_scenario_id],ARRAY['ps_recommended_override', 'ps_recommended_scenarios_stack_override']);
	    CALL price_promo_opt.pc_promo_refresh_fin_agg_v1(ARRAY[_promo_id],ARRAY['ps_recommended_finalized_override', 'ps_recommended_finalized_stack_override']);

	END IF;

    END;
$function$
;
