--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:fn_scenario_override_stack_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for fn_scenario_override_stack_2

DROP FUNCTION if exists price_promo_opt.fn_scenario_override_stack_2;
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

    _column_list TEXT;

    _select_list TEXT;

    _column TEXT;

	_multiplier_columns TEXT[];

	_baseline_multiplier_columns TEXT[];

	_other_columns TEXT[];

    _incremental_columns TEXT[];



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



    -- Build column lists for queries

    _column_list := '';

    _select_list := '';





_multiplier_columns := ARRAY['promo_spend', 'sales_units', 'revenue', 'margin', 'affinity_units', 

        'cannibalization_units', 'pull_forward_units', 'affinity_revenue', 'cannibalization_revenue', 

        'pull_forward_revenue', 'affinity_margin', 'cannibalization_margin', 'pull_forward_margin',

        'contribution_revenue', 'contribution_margin',

		--Adding the vat related columns here

		'promo_spend_with_vat','revenue_with_vat', 	'margin_with_vat','affinity_revenue_with_vat',

		'cannibalization_revenue_with_vat','pull_forward_revenue_with_vat', 'affinity_margin_with_vat',

		'cannibalization_margin_with_vat', 'pull_forward_margin_with_vat', 'contribution_revenue_with_vat', 

		'contribution_margin_with_vat', 'coupon_amount']; 



_baseline_multiplier_columns := ARRAY['baseline_sales_units', 'baseline_revenue', 'baseline_margin',

							--Adding the vat related columns here

							'baseline_revenue_with_vat','baseline_margin_with_vat' ];



_other_columns := ARRAY['event_id', 'promo_id', 'scenario_id', 'product_id', 'recommendation_date', 'customer_id',

        's0_id', 's1_id', 'discount_level_value', 'offer_type_id', 'effective_discount', 'original_cost', 

        'discounted_price', 'calculated_discount', 'created_by', 'updated_by', 'created_at', 'updated_at', 

		--Adding the currency & vat related columns here

		'vat_percentage','currency_id','effective_discount_with_vat','original_cost_with_vat',

		'discounted_price_with_vat', 'store_hierarchy' ];



    -- Add other columns (no multiplication)

    FOREACH _column IN ARRAY _other_columns LOOP

        _column_list := _column_list || _column || ', ';

        _select_list := _select_list || _column || ', ';

    END LOOP;



    -- Add multiplier columns

    FOREACH _column IN ARRAY _multiplier_columns LOOP

        _column_list := _column_list || _column || ', ';

        _select_list := _select_list || _column || ' * ' || _multiplier || ' AS ' || _column || ', ';

    END LOOP;



    -- Add baseline multiplier columns

    FOREACH _column IN ARRAY _baseline_multiplier_columns LOOP

        _column_list := _column_list || _column || ', ';

        _select_list := _select_list || _column || ' * ' || _baseline_multiplier || ' AS ' || _column || ', ';

    END LOOP;



    -- Add incremental columns

    _incremental_columns := ARRAY['incremental_sales_units', 'incremental_revenue', 'incremental_margin',



								'incremental_revenue_with_vat','incremental_margin_with_vat'];

    FOREACH _column IN ARRAY _incremental_columns LOOP

        _column_list := _column_list || _column || ', ';

        IF _column = 'incremental_sales_units' THEN

            _select_list := _select_list || '(sales_units * ' || _multiplier || ') - (baseline_sales_units * ' || _baseline_multiplier || ') AS ' || _column || ', ';

        ELSIF _column = 'incremental_revenue' THEN

            _select_list := _select_list || '(revenue * ' || _multiplier || ') - (baseline_revenue * ' || _baseline_multiplier || ') AS ' || _column || ', ';

        ELSIF _column = 'incremental_margin' THEN

            _select_list := _select_list || '(margin * ' || _multiplier || ') - (baseline_margin * ' || _baseline_multiplier || ') AS ' || _column || ', ';



		ELSIF _column = 'incremental_revenue_with_vat' THEN 

			_select_list := _select_list || '(revenue_with_vat * ' || _multiplier || ') - (baseline_revenue_with_vat * ' || _baseline_multiplier || ') AS ' || _column || ', ';



		ELSIF _column = 'incremental_margin_with_vat' THEN 

			_select_list := _select_list || '(margin_with_vat * ' || _multiplier || ') - (baseline_margin_with_vat * ' || _baseline_multiplier || ') AS ' || _column || ', ';



        END IF;

    END LOOP;



    -- Remove trailing comma and space

    _column_list := RTRIM(_column_list, ', ');

    _select_list := RTRIM(_select_list, ', ');



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



    -- Insert new records into the normal destination table

    _query := format('

        INSERT INTO %1$s (%2$s)

        SELECT %3$s

        FROM %4$s

        WHERE promo_id = %5$s %6$s;',

        _destination_table_normal,

        _column_list,

        _select_list,

        _reference_table_normal,

        _promo_id,

        CASE WHEN _scenario_id != 0 THEN format('AND scenario_id = %1$s', _scenario_id) ELSE '' END

    );



    RAISE NOTICE 'Query 2: %', _query;

    EXECUTE _query;

    query_end_time := NOW();

    RAISE NOTICE 'Query 2 duration: % seconds', query_end_time - query_start_time;



    -- Insert new records into the stack destination table

    _query := format('

        INSERT INTO %1$s (%2$s)

        SELECT %3$s

        FROM %4$s

        WHERE promo_id = %5$s %6$s;',

        _destination_table_stack,

        _column_list,

        _select_list,

        _reference_table_stack,

        _promo_id,

        CASE WHEN _scenario_id != 0 THEN format('AND scenario_id = %1$s', _scenario_id) ELSE '' END

    );



    RAISE NOTICE 'Query 3: %', _query;

    EXECUTE _query;

    query_end_time := NOW();

    RAISE NOTICE 'Query 3 duration: % seconds', query_end_time - query_start_time;



    -- Refresh aggregate tables

    IF _scenario_id = 0 THEN

        CALL price_promo_opt.pc_promo_refresh_ia_agg_v1_balsam(array[_promo_id],

        ARRAY['ps_recommended_override_ia', 'ps_recommended_stack_override_ia']);

    ELSE

        CALL price_promo_opt.pc_promo_refresh_scenario_agg_v1_balsam(array[_promo_id], array[_scenario_id],

        ARRAY['ps_recommended_override', 'ps_recommended_scenarios_stack_override']);

    END IF;



    -- Operation completed

    RAISE NOTICE 'Completed inserting for promo_id: %, scenario_id: %', _promo_id, _scenario_id;



END;

$function$



;