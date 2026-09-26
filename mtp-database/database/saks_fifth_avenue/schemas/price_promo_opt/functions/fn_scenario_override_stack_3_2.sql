--liquibase formatted sql
--changeset liquibase:fn_scenario_override_stack_3_2.1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_scenario_override_stack_3_2

DROP FUNCTION IF EXISTS price_promo_opt.fn_scenario_override_stack_3_2;

CREATE OR REPLACE FUNCTION price_promo_opt.fn_scenario_override_stack_3_2(_promo_id integer, _scenario_id integer, _multiplier numeric, _baseline_multiplier numeric, _user_id integer)
 RETURNS integer[]
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
 -- Time tracking
    start_time TIMESTAMP;
    end_time TIMESTAMP;
   	_min_start_date DATE;
    _max_start_date DATE;
   	p_promo_id INT;
    _last_approved_scenario_id INT;
    _status INT;
    _start_date DATE;
    _end_date DATE;

    -- Finalized tables (normal and stack)
    _finalized_normal TEXT := 'price_promo.ps_recommended_finalized';
    _finalized_normal_override TEXT := 'price_promo.ps_recommended_finalized_override';
    _finalized_stack TEXT := 'price_promo.ps_recommended_finalized_stack';
    _finalized_stack_override TEXT := 'price_promo.ps_recommended_finalized_stack_override';

    -- Scenario tables (normal, override, IA, stack)
    _scenario_normal TEXT := 'price_promo.ps_recommended_scenarios';
    _scenario_override TEXT := 'price_promo.ps_recommended_override';
    _scenario_ia TEXT := 'price_promo.ps_recommended_ia_projected';
    _scenario_ia_override TEXT := 'price_promo.ps_recommended_override_ia';
    _scenario_stack TEXT := 'price_promo.ps_recommended_scenarios_stack';
    _scenario_stack_override TEXT := 'price_promo.ps_recommended_scenarios_stack_override';
    _scenario_stack_ia TEXT := 'price_promo.ps_recommended_stack_ia';
    _scenario_stack_ia_override TEXT := 'price_promo.ps_recommended_stack_override_ia';

   	---Overlap variables
    _init_non_review_promo_ids INT[] := ARRAY[]::INT[];
    _overlap_non_review_promo_ids INT[] := ARRAY[]::INT[];
    _overlap_non_review_scenario_ids INT[] := ARRAY[]::INT[];
    _overlap_non_review_ia_scenario_ids INT[] := ARRAY[]::INT[];

   vl_test_query TEXT;
   _query TEXT;


begin

	RAISE NOTICE '%Function to delete from NON Review promo (Finalized and Scenario tables)', CHR(10);
    -- Record operation start time
    start_time := NOW();
    SELECT MIN(start_date), MAX(end_date)
    INTO _min_start_date, _max_start_date
    FROM price_promo.promo_master
    WHERE promo_id = _promo_id;
    RAISE NOTICE 'min_start_date: %, max_start_date: %', _min_start_date, _max_start_date;


	------------- create unlogged table with both multipliers for promo overridden
	_query := format('DROP TABLE IF exists price_promo_opt_temp.fin_override_multiplier_%1$s;
	    CREATE UNLOGGED TABLE price_promo_opt_temp.fin_override_multiplier_%1$s AS
	    SELECT
	        product_id, recommendation_date, s0_id, s1_id,
	        %2$s AS multiplier,
	        %3$s AS baseline_multiplier
	    FROM %4$s
	    WHERE promo_id = %1$s;

		CREATE INDEX idx_fin_override_mult_%1$s_date_product
        ON price_promo_opt_temp.fin_override_multiplier_%1$s  (product_id,recommendation_date);',
	    _promo_id,            -- %1$s: promo_id used in the table name
	    _multiplier,          -- %2$s: multiplier value
	    _baseline_multiplier,  -- %3$s: baseline_multiplier value,
	    _finalized_normal
	);
    RAISE NOTICE 'Query 1: %', _query;
	EXECUTE _query;
    RAISE NOTICE 'Query 1 duration: % seconds', EXTRACT(SECOND FROM NOW() - start_time);

    -- Query 0: Get Init review promo_ids with overlapping dates and status in (4, 8)
    vl_test_query := format(
        'SELECT array_agg(promo_id) FROM price_promo.promo_master
		 WHERE status IN (4, 8) AND end_date >= %L AND start_date <= %L
		 and promo_id <> %3$s;',
        _min_start_date, _max_start_date,_promo_id
    );
    RAISE NOTICE 'query- 0 --%', vl_test_query;
    start_time := clock_timestamp();
    EXECUTE vl_test_query INTO _init_non_review_promo_ids;

    IF array_length(_init_non_review_promo_ids, 1) IS NOT NULL THEN
        -- Step 2.1: Fetch overlapping non-review promo_ids
        vl_test_query := format(
            'SELECT array_agg(DISTINCT promo_id)
            FROM %3$s a
            JOIN price_promo_opt_temp.fin_override_multiplier_%1$s b
            ON a.product_id = b.product_id
            AND a.recommendation_date = b.recommendation_date
            AND a.s0_id = b.s0_id
            AND a.s1_id = b.s1_id
            WHERE a.promo_id = ANY(%2$s);',
            _promo_id, quote_literal(_init_non_review_promo_ids), _finalized_normal
        );
        EXECUTE vl_test_query INTO _overlap_non_review_promo_ids;

        IF array_length(_overlap_non_review_promo_ids, 1) IS NOT NULL THEN
		    -- Loop through each promo_id in _overlap_non_review_promo_ids
		    FOREACH p_promo_id IN ARRAY _overlap_non_review_promo_ids LOOP
		        -- Fetch details for each promo_id
		        SELECT last_approved_scenario_id, status, start_date, end_date
		        INTO _last_approved_scenario_id, _status, _start_date, _end_date
		        FROM price_promo.promo_master
		        WHERE promo_id = p_promo_id;

		        -- Raise a notice to debug fetched values
		        RAISE NOTICE 'Processing promo_id: %, Scenario ID: %, Status: %, Start Date: %, End Date: %',
		                      p_promo_id, _last_approved_scenario_id, _status, _start_date, _end_date;

		        -- Call simulation procedure for the current promo_id and scenario_id
		        CALL price_promo_opt.pc_simulation_create_column_day_partitions(
		            'price_promo.ps_recommended_finalized_override', ARRAY[p_promo_id], _start_date, _end_date);

		       	IF _last_approved_scenario_id  <> 0 THEN
			        CALL price_promo_opt.pc_simulation_create_column_day_partitions(
			            'price_promo.ps_recommended_override', ARRAY[_last_approved_scenario_id], _start_date, _end_date);
			        CALL price_promo_opt.pc_simulation_create_column_day_partitions(
			            'price_promo.ps_recommended_scenarios_stack_override', ARRAY[_last_approved_scenario_id], _start_date, _end_date);
			    ELSE
			        CALL price_promo_opt.pc_simulation_create_column_day_partitions(
			            'price_promo.ps_recommended_override_ia', ARRAY[p_promo_id], _start_date, _end_date);
			        CALL price_promo_opt.pc_simulation_create_column_day_partitions(
			            'price_promo.ps_recommended_stack_override_ia', ARRAY[p_promo_id], _start_date, _end_date);
		        END IF;
		    END LOOP;

		    -- Step 2.2: Fetch non-review scenario_ids
		    vl_test_query := format(
		        'SELECT array_agg(last_approved_scenario_id)
		        FROM price_promo.promo_master
		        WHERE status IN (4, 8) AND end_date >= %L AND start_date <= %L
		        AND promo_id = ANY(%3$s) AND last_approved_scenario_id <> 0;',
		        _min_start_date, _max_start_date, quote_literal(_overlap_non_review_promo_ids)
		    );
		    EXECUTE vl_test_query INTO _overlap_non_review_scenario_ids;

		    -- Step 2.3: Fetch non-review IA promo_ids
		    vl_test_query := format(
		        'SELECT array_agg(promo_id)
		        FROM price_promo.promo_master
		        WHERE status IN (4, 8) AND end_date >= %L AND start_date <= %L
		        AND promo_id = ANY(%3$s) AND last_approved_scenario_id = 0;',
		        _min_start_date, _max_start_date, quote_literal(_overlap_non_review_promo_ids)
		    );
		    EXECUTE vl_test_query INTO _overlap_non_review_ia_scenario_ids;

		    -- Log the results
		    RAISE NOTICE 'Overlapping Non-Review Scenario IDs: %', _overlap_non_review_scenario_ids;
		    RAISE NOTICE 'Overlapping Non-Review IA Promo IDs: %', _overlap_non_review_ia_scenario_ids;
		END IF;
    END IF;



IF array_length(_overlap_non_review_promo_ids, 1) is NOT NULL THEN

	------------- Change FO for Overlapping promos PCC-Date using Finalized table

	_query := format('
	    -- Delete overlapping promos from the finalized override table
	    DELETE FROM %7$s a
	    USING price_promo_opt_temp.fin_override_multiplier_%1$s b
	    WHERE a.product_id = b.product_id
	      AND a.recommendation_date = b.recommendation_date
	      AND a.s0_id = b.s0_id
	      AND a.s1_id = b.s1_id
	      AND a.promo_id = ANY(%2$s);

	    -- Insert new data into the finalized override table
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
	        event_id, promo_id, c.product_id, c.recommendation_date, c.s0_id, c.s1_id, discount_level_value,
	        offer_type_id, effective_discount,
	        original_cost, discounted_price,
	        promo_spend * %3$s AS promo_spend,                       -- Adjust promo spend
	        sales_units * %3$s AS sales_units,                       -- Adjust sales units
	        baseline_sales_units * %4$s AS baseline_sales_units,     -- Adjust baseline sales units
	        (sales_units * %3$s) - (baseline_sales_units * %4$s) AS incremental_sales_units,
	        revenue * %3$s AS revenue,                               -- Adjust revenue
	        baseline_revenue * %4$s AS baseline_revenue,             -- Adjust baseline revenue
	        (revenue * %3$s) - (baseline_revenue * %4$s) AS incremental_revenue,
	        margin * %3$s AS margin,                                 -- Adjust margin
	        baseline_margin * %4$s AS baseline_margin,               -- Adjust baseline margin
	        (margin * %3$s) - (baseline_margin * %4$s) AS incremental_margin,
	        affinity_revenue * %3$s AS affinity_revenue,             -- Adjust affinity revenue
	        cannibalization_revenue * %3$s AS cannibalization_revenue,
	        pull_forward_revenue * %3$s AS pull_forward_revenue,
	        affinity_margin * %3$s AS affinity_margin,               -- Adjust affinity margin
	        cannibalization_margin * %3$s AS cannibalization_margin,
	        pull_forward_margin * %3$s AS pull_forward_margin,
	        %6$s AS created_by,                                      -- Use provided user ID
	        NULL AS updated_by,                                      -- Set updated_by to NULL
	        NOW() AS created_at, NOW() AS updated_at,                -- Set timestamps
	        contribution_revenue * %3$s AS contribution_revenue,     -- Adjust contribution revenue
	        contribution_margin * %3$s AS contribution_margin        -- Adjust contribution margin
	    FROM %5$s c
		INNER JOIN  price_promo_opt_temp.fin_override_multiplier_%1$s d
	    ON c.product_id = d.product_id
	      AND c.recommendation_date = d.recommendation_date
	      AND c.s0_id = d.s0_id
	      AND c.s1_id = d.s1_id
	    WHERE c.promo_id = ANY(%2$s);',
	    _promo_id, quote_literal(_overlap_non_review_promo_ids), _multiplier, _baseline_multiplier,
	    _finalized_normal, _user_id, _finalized_normal_override
	);
	RAISE NOTICE 'Query 2: %', _query;
	EXECUTE _query;
    RAISE NOTICE 'Query 2 duration: % seconds', EXTRACT(SECOND FROM NOW() - start_time);

   	--Refersh Fin agg
    CALL price_promo_opt.pc_promo_refresh_fin_agg_v1(_overlap_non_review_promo_ids,
    ARRAY['ps_recommended_finalized_override']);

END IF;


IF array_length(_overlap_non_review_scenario_ids, 1) is NOT NULL then

------------- Change Scenario Override for Overlapping promos PCC-Date using Scenarios Normal table
    _query := format('
		-- Delete overlapping promos from the Scenarios override table
	    DELETE FROM %7$s a
	    USING price_promo_opt_temp.fin_override_multiplier_%1$s b
	    WHERE a.product_id = b.product_id
	      AND a.recommendation_date = b.recommendation_date
	      AND a.s0_id = b.s0_id
	      AND a.s1_id = b.s1_id
	      AND a.scenario_id = ANY(%2$s);


        INSERT INTO %7$s (
            event_id, promo_id, scenario_id, product_id, recommendation_date, s0_id, s1_id,
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
            event_id, promo_id, scenario_id, c.product_id, c.recommendation_date, c.s0_id, c.s1_id,
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
            %5$s c
		INNER JOIN  price_promo_opt_temp.fin_override_multiplier_%1$s d
	    ON c.product_id = d.product_id
	      AND c.recommendation_date = d.recommendation_date
	      AND c.s0_id = d.s0_id
	      AND c.s1_id = d.s1_id
        WHERE c.scenario_id = ANY(%2$s);',
        _promo_id, quote_literal(_overlap_non_review_scenario_ids), _multiplier, _baseline_multiplier,
        _scenario_normal, _user_id, _scenario_override
    );

    RAISE NOTICE 'Query 3: %', _query;
	EXECUTE _query;
    RAISE NOTICE 'Query 3 duration: % seconds', EXTRACT(SECOND FROM NOW() - start_time);

	------------- Change Stacked Override for Overlapping promos PCC-Date using Scenarios Stack table
       _query := format('
		-- Delete overlapping promos from the Scenario-Stacked override table
	    DELETE FROM %7$s a
	    USING price_promo_opt_temp.fin_override_multiplier_%1$s b
	    WHERE a.product_id = b.product_id
	      AND a.recommendation_date = b.recommendation_date
	      AND a.s0_id = b.s0_id
	      AND a.s1_id = b.s1_id
	      AND a.scenario_id = ANY(%2$s);


        INSERT INTO %7$s (
            event_id, promo_id, scenario_id, product_id, recommendation_date, s0_id, s1_id,
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
            event_id, promo_id, scenario_id, c.product_id, c.recommendation_date, c.s0_id, c.s1_id,
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
            %5$s c
		INNER JOIN  price_promo_opt_temp.fin_override_multiplier_%1$s d
	    ON c.product_id = d.product_id
	      AND c.recommendation_date = d.recommendation_date
	      AND c.s0_id = d.s0_id
	      AND c.s1_id = d.s1_id
        WHERE c.scenario_id = ANY(%2$s);',
        _promo_id, quote_literal(_overlap_non_review_scenario_ids), _multiplier, _baseline_multiplier,
        _scenario_stack, _user_id, _scenario_stack_override
    );

	RAISE NOTICE 'Query 4: %', _query;
	EXECUTE _query;
    RAISE NOTICE 'Query 4 duration: % seconds', EXTRACT(SECOND FROM NOW() - start_time);

	--Refersh Scenario overide and Stack override agg
    CALL price_promo_opt.pc_promo_refresh_scenario_agg_v1(ARRAY[_promo_id], _overlap_non_review_scenario_ids,
   	ARRAY['ps_recommended_override', 'ps_recommended_scenarios_stack_override']);


END IF;


IF array_length(_overlap_non_review_ia_scenario_ids, 1) is NOT NULL then
	------------- Change IA Normal Override for Overlapping promos PCC-Date using Scenarios Normal table

    _query := format('
		-- Delete overlapping promos from the IA override table
	    DELETE FROM %7$s a
	    USING price_promo_opt_temp.fin_override_multiplier_%1$s b
	    WHERE a.product_id = b.product_id
	      AND a.recommendation_date = b.recommendation_date
	      AND a.s0_id = b.s0_id
	      AND a.s1_id = b.s1_id
	      AND a.promo_id = ANY(%2$s);


        INSERT INTO %7$s (
            event_id, promo_id, product_id, recommendation_date, s0_id, s1_id,
            discount_level_value, offer_type_id,
            effective_discount, original_cost, discounted_price, promo_spend,
            sales_units, baseline_sales_units, incremental_sales_units,
            revenue, baseline_revenue, incremental_revenue, margin,
            baseline_margin, incremental_margin, affinity_units,
            cannibalization_units, pull_forward_units, affinity_revenue, cannibalization_revenue,
            pull_forward_revenue, affinity_margin, cannibalization_margin, pull_forward_margin,
            calculated_discount, created_by, updated_by,
            created_at, recommendation_type_id, updated_at, contribution_revenue, contribution_margin
        )
        SELECT
            event_id, promo_id, c.product_id, c.recommendation_date, c.s0_id, c.s1_id,
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
            %5$s c
		INNER JOIN  price_promo_opt_temp.fin_override_multiplier_%1$s d
	    ON c.product_id = d.product_id
	      AND c.recommendation_date = d.recommendation_date
	      AND c.s0_id = d.s0_id
	      AND c.s1_id = d.s1_id
        WHERE c.promo_id = ANY(%2$s);',
        _promo_id, quote_literal(_overlap_non_review_ia_scenario_ids), _multiplier, _baseline_multiplier,
        _scenario_ia, _user_id, _scenario_ia_override
    );

    RAISE NOTICE 'Query 5: %', _query;
	EXECUTE _query;
    RAISE NOTICE 'Query 5 duration: % seconds', EXTRACT(SECOND FROM NOW() - start_time);


	------------- Change IA Stacked Override for Overlapping promos PCC-Date using Scenarios Stack table
       _query := format('
		-- Delete overlapping promos from the Scenarios override table
	    DELETE FROM %7$s a
	    USING price_promo_opt_temp.fin_override_multiplier_%1$s b
	    WHERE a.product_id = b.product_id
	      AND a.recommendation_date = b.recommendation_date
	      AND a.s0_id = b.s0_id
	      AND a.s1_id = b.s1_id
	      AND a.promo_id = ANY(%2$s);


        INSERT INTO %7$s (
            event_id, promo_id, product_id, recommendation_date, s0_id, s1_id,
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
            event_id, promo_id, c.product_id, c.recommendation_date, c.s0_id, c.s1_id,
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
            %5$s c
		INNER JOIN  price_promo_opt_temp.fin_override_multiplier_%1$s d
	    ON c.product_id = d.product_id
	      AND c.recommendation_date = d.recommendation_date
	      AND c.s0_id = d.s0_id
	      AND c.s1_id = d.s1_id
        WHERE c.promo_id = ANY(%2$s);',
        _promo_id, quote_literal(_overlap_non_review_ia_scenario_ids), _multiplier, _baseline_multiplier,
        _scenario_stack, _user_id, _scenario_stack_override
    );

    RAISE NOTICE 'Query 6: %', _query;
	EXECUTE _query;
    RAISE NOTICE 'Query 6 duration: % seconds', EXTRACT(SECOND FROM NOW() - start_time);

    --Refersh IA overide and IA Stack override agg
   	CALL price_promo_opt.pc_promo_refresh_ia_agg_v1(_overlap_non_review_ia_scenario_ids,
   	ARRAY[ 'ps_recommended_override_ia', 'ps_recommended_stack_override_ia']);

end if;

    RAISE NOTICE 'Completed inserting for Non review promo_id: %, scenario_id: %', _promo_id, _scenario_id;
    RETURN _overlap_non_review_promo_ids;
END;
$function$
;
