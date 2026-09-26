--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:fn_scenario_override_stack_3_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for fn_scenario_override_stack_3_2

DROP FUNCTION if exists price_promo_opt.fn_scenario_override_stack_3_2;
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



    -- Overlap variables

    _init_non_review_promo_ids INT[] := ARRAY[]::INT[];

    _overlap_non_review_promo_ids INT[] := ARRAY[]::INT[];

    _overlap_non_review_scenario_ids INT[] := ARRAY[]::INT[];

    _overlap_non_review_ia_scenario_ids INT[] := ARRAY[]::INT[];



    -- Column arrays

    _mult_cols TEXT[];

    _baseline_cols TEXT[];

    _no_change_cols TEXT[];

    _special_cols TEXT[];



    -- Query building variables

    vl_test_query TEXT;

    _query TEXT;

    _column TEXT;

    _select_list TEXT;

    _column_list TEXT;



    _multiplier_columns text[];

    _baseline_multiplier_columns text[] ;

    _no_change_columns text[] ;

    _special_logic_columns text[];



BEGIN

    -- Set default values for column arrays if not provided

        _multiplier_columns := ARRAY[

            'promo_spend', 'sales_units', 'revenue', 'margin',

            'affinity_revenue', 'cannibalization_revenue', 'pull_forward_revenue',

            'affinity_margin', 'cannibalization_margin', 'pull_forward_margin',

            'contribution_revenue', 'contribution_margin',

            'coupon_spend'

            ];

        _baseline_multiplier_columns := ARRAY[

            'baseline_sales_units', 'baseline_revenue', 'baseline_margin'

            ];



        _no_change_columns := ARRAY[

            'event_id', 'promo_id',  'product_id', 'recommendation_date',

             'discount_level_value', 'offer_type_id',

            'effective_discount', 'original_cost', 'discounted_price',

            'created_by', 'updated_by', 'created_at', 'updated_at',
		 'vat_percentage', 'currency_id', 'store_reco_level' , 'customer_reco_level'

        ];



        _special_logic_columns := ARRAY[

            'incremental_sales_units', 'incremental_revenue', 'incremental_margin'

             ];

    -- Function to build column list

    CREATE OR REPLACE FUNCTION build_column_list(

        p_mult_cols text[],

        p_baseline_cols text[],

        p_no_change_cols text[],

        p_special_cols text[]

    ) RETURNS text AS $$

    DECLARE

        v_column_list text := '';

        v_col text;

    BEGIN

        -- Add no change columns

        FOREACH v_col IN ARRAY p_no_change_cols LOOP

            v_column_list := v_column_list || v_col || ', ';

        END LOOP;



        -- Add multiplier columns

        FOREACH v_col IN ARRAY p_mult_cols LOOP

            v_column_list := v_column_list || v_col || ', ';

        END LOOP;



        -- Add baseline multiplier columns

        FOREACH v_col IN ARRAY p_baseline_cols LOOP

            v_column_list := v_column_list || v_col || ', ';

        END LOOP;



        -- Add special logic columns

        FOREACH v_col IN ARRAY p_special_cols LOOP

            v_column_list := v_column_list || v_col || ', ';

        END LOOP;



        -- Remove trailing comma and space

        v_column_list := RTRIM(v_column_list, ', ');

        RETURN v_column_list;

    END;

    $$ LANGUAGE plpgsql;





    -- Function to build select list

    CREATE OR REPLACE FUNCTION build_select_list(

        p_mult_cols text[],

        p_baseline_cols text[],

        p_no_change_cols text[],

        p_special_cols text[],

        p_multiplier numeric,

        p_baseline_multiplier numeric

    ) RETURNS text AS $$

    DECLARE

        v_select_list text := '';

        v_col text;

    BEGIN

        -- Add no change columns

        FOREACH v_col IN ARRAY p_no_change_cols LOOP

            v_select_list := v_select_list || v_col || ', ';

        END LOOP;



        -- Add multiplier columns

        FOREACH v_col IN ARRAY p_mult_cols LOOP

            v_select_list := v_select_list || v_col || ' * ' || p_multiplier || ' AS ' || v_col || ', ';

        END LOOP;



        -- Add baseline multiplier columns

        FOREACH v_col IN ARRAY p_baseline_cols LOOP

            v_select_list := v_select_list || v_col || ' * ' || p_baseline_multiplier || ' AS ' || v_col || ', ';

        END LOOP;



        -- Add special logic columns

        FOREACH v_col IN ARRAY p_special_cols LOOP

            IF v_col = 'incremental_sales_units' THEN

                v_select_list := v_select_list || '(sales_units * ' || p_multiplier || ') - (baseline_sales_units * ' || p_baseline_multiplier || ') AS incremental_sales_units, ';

            ELSIF v_col = 'incremental_revenue' THEN

                v_select_list := v_select_list || '(revenue * ' || p_multiplier || ') - (baseline_revenue * ' || p_baseline_multiplier || ') AS incremental_revenue, ';

            ELSIF v_col = 'incremental_margin' THEN

                v_select_list := v_select_list || '(margin * ' || p_multiplier || ') - (baseline_margin * ' || p_baseline_multiplier || ') AS incremental_margin, ';

--			ELSIF v_col = 'incremental_revenue_with_vat' THEN
--
--            v_select_list := v_select_list || '(revenue_with_vat * ' || p_multiplier || ') - (baseline_revenue_with_vat * ' || p_baseline_multiplier || ') AS incremental_revenue_with_vat, ';
--
--        	ELSIF v_col = 'incremental_margin_with_vat' THEN
--
--            v_select_list := v_select_list || '(margin_with_vat * ' || p_multiplier || ') - (baseline_margin_with_vat * ' || p_baseline_multiplier || ') AS incremental_margin_with_vat, ';

            END IF;

        END LOOP;



        -- Remove trailing comma and space

        v_select_list := RTRIM(v_select_list, ', ');

        RETURN v_select_list;

    END;

    $$ LANGUAGE plpgsql;





    -- Build column list for the INSERT statement

    _column_list := build_column_list(

        _multiplier_columns,

        _baseline_multiplier_columns,

        _no_change_columns,

        _special_logic_columns

    );



    -- Build select list for the SELECT statement

    _select_list := build_select_list(

        _multiplier_columns,

        _baseline_multiplier_columns,

        _no_change_columns,

        _special_logic_columns,

        _multiplier,

        _baseline_multiplier

    );

















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

	        product_id, recommendation_date, store_reco_level, customer_reco_level,

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

using(product_id, recommendation_date, store_reco_level, customer_reco_level)

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







    -- Rest of your existing code...

    -- For example, in your first query:



IF array_length(_overlap_non_review_promo_ids, 1) is NOT NULL THEN

    _query := format('



-- Delete overlapping promos from the finalized override table

	    DELETE FROM %7$s a

	    USING price_promo_opt_temp.fin_override_multiplier_%3$s b

	    WHERE a.product_id = b.product_id

	      AND a.recommendation_date = b.recommendation_date


	      AND a.promo_id = ANY(%4$s);





        INSERT INTO %7$s (%2$s)

        SELECT %1$s

        FROM %5$s c

        INNER JOIN price_promo_opt_temp.fin_override_multiplier_%3$s d

using(product_id, recommendation_date, store_reco_level,customer_reco_level)

--        AND c.s0_id = d.s0_id
--
--        AND c.s1_id = d.s1_id

        WHERE c.promo_id = ANY(%4$s);',

        _select_list,

        _column_list,

        _promo_id,

        quote_literal(_overlap_non_review_promo_ids),

        _finalized_normal,

        _user_id,

        _finalized_normal_override

    );

RAISE NOTICE 'Query 2: %', _query;

	EXECUTE _query;

    RAISE NOTICE 'Query 2 duration: % seconds', EXTRACT(SECOND FROM NOW() - start_time);



   	--Refersh Fin agg

    CALL price_promo_opt.pc_promo_refresh_fin_agg_v1(_overlap_non_review_promo_ids,

    ARRAY['ps_recommended_finalized_override']);



END IF;









IF array_length(_overlap_non_review_scenario_ids, 1) is NOT NULL then

_query := format('



-- Delete overlapping promos from the Scenarios override table

	    DELETE FROM %7$s a

	    USING price_promo_opt_temp.fin_override_multiplier_%3$s b

	    WHERE a.product_id = b.product_id

	      AND a.recommendation_date = b.recommendation_date



	      AND a.scenario_id = ANY(%4$s);





        INSERT INTO %7$s (%2$s)

        SELECT %1$s

        FROM %5$s c

        INNER JOIN price_promo_opt_temp.fin_override_multiplier_%3$s d

        using(product_id, recommendation_date, store_reco_level,customer_reco_level)
--
--        AND c.s0_id = d.s0_id
--
--        AND c.s1_id = d.s1_id

        WHERE c.scenario_id = ANY(%4$s);',

        concat(_select_list, ', scenario_id'),
 		concat(_column_list, ', scenario_id'),


        _promo_id,

        quote_literal(_overlap_non_review_scenario_ids),

        _scenario_normal,

        _user_id,

        _scenario_override

    );

RAISE NOTICE 'Query 2: %', _query;

	EXECUTE _query;

    RAISE NOTICE 'Query 2 duration: % seconds', EXTRACT(SECOND FROM NOW() - start_time);





_query := format('



-- Delete overlapping promos from the Scenarios Stack override table

	    DELETE FROM %7$s a

	    USING price_promo_opt_temp.fin_override_multiplier_%3$s b

	    WHERE a.product_id = b.product_id

	      AND a.recommendation_date = b.recommendation_date


	      AND a.scenario_id = ANY(%4$s);





        INSERT INTO %7$s (%2$s)

        SELECT %1$s

        FROM %5$s c

        INNER JOIN price_promo_opt_temp.fin_override_multiplier_%3$s d

using(product_id, recommendation_date, store_reco_level, customer_reco_level)

--        AND c.s0_id = d.s0_id
--
--        AND c.s1_id = d.s1_id

        WHERE c.scenario_id = ANY(%4$s);',

  		concat(_select_list, ', scenario_id'),
 		concat(_column_list, ', scenario_id'),

        _promo_id,

        quote_literal(_overlap_non_review_scenario_ids),

        _scenario_stack,

        _user_id,

        _scenario_stack_override

    );

RAISE NOTICE 'Query 2: %', _query;

	EXECUTE _query;

    RAISE NOTICE 'Query 2 duration: % seconds', EXTRACT(SECOND FROM NOW() - start_time);



	--Refersh Scenario overide and Stack override agg

    CALL price_promo_opt.pc_promo_refresh_scenario_agg_v1(ARRAY[_promo_id], _overlap_non_review_scenario_ids,

   	ARRAY['ps_recommended_override', 'ps_recommended_scenarios_stack_override']);





END IF;







IF array_length(_overlap_non_review_ia_scenario_ids, 1) is NOT NULL then



_query := format('



-- Delete overlapping promos from the IA override table

	    DELETE FROM %7$s a

	    USING price_promo_opt_temp.fin_override_multiplier_%3$s b

	    WHERE a.product_id = b.product_id

	      AND a.recommendation_date = b.recommendation_date


	      AND a.scenario_id = ANY(%4$s);





        INSERT INTO %7$s (%2$s)

        SELECT %1$s

        FROM %5$s c

        INNER JOIN price_promo_opt_temp.fin_override_multiplier_%3$s d
using(product_id, recommendation_date)
--
--        AND c.s0_id = d.s0_id
--
--        AND c.s1_id = d.s1_id

        WHERE c.promo_id = ANY(%4$s);',

        _select_list,

        _column_list,

        _promo_id,

        quote_literal(_overlap_non_review_ia_scenario_ids),

        _scenario_ia,

        _user_id,

        _scenario_ia_override

    );

RAISE NOTICE 'Query 2: %', _query;

	EXECUTE _query;

    RAISE NOTICE 'Query 2 duration: % seconds', EXTRACT(SECOND FROM NOW() - start_time);





_query := format('



-- Delete overlapping promos from the IA Stack override table

	    DELETE FROM %7$s a

	    USING price_promo_opt_temp.fin_override_multiplier_%1$s b

	    WHERE a.product_id = b.product_id

	      AND a.recommendation_date = b.recommendation_date



	      AND a.scenario_id = ANY(%3$s);





        INSERT INTO %7$s (%2$s)

        SELECT %1$s

        FROM %5$s c

        INNER JOIN price_promo_opt_temp.fin_override_multiplier_%3$s d
using(product_id, recommendation_date)
--
--        AND c.s0_id = d.s0_id
--
--        AND c.s1_id = d.s1_id

        WHERE c.promo_id = ANY(%4$s);',

        _select_list,

        _column_list,

        _promo_id,

        quote_literal(_overlap_non_review_ia_scenario_ids),

        _scenario_stack_ia,

        _user_id,

        _scenario_stack_ia_override

    );

RAISE NOTICE 'Query 2: %', _query;

	EXECUTE _query;

    RAISE NOTICE 'Query 2 duration: % seconds', EXTRACT(SECOND FROM NOW() - start_time);



	--Refersh Scenario overide and Stack override agg

    CALL price_promo_opt.pc_promo_refresh_scenario_agg_v1(ARRAY[_promo_id], _overlap_non_review_scenario_ids,

   	ARRAY['ps_recommended_override_ia', 'ps_recommended_stack_override_ia']);





END IF;





    RAISE NOTICE 'Completed inserting for Non review promo_id: %, scenario_id: %', _promo_id, _scenario_id;

    RETURN _overlap_non_review_promo_ids;

END;

$function$
;

