--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:fn_scenario_override_stack_3_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for fn_scenario_override_stack_3_1

DROP FUNCTION if exists price_promo_opt.fn_scenario_override_stack_3_1;
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

    _column_list TEXT;

    _select_list TEXT;

    _column TEXT;

    _multiplier_columns TEXT[];

    _baseline_multiplier_columns TEXT[];

    _other_columns TEXT[];

    _incremental_columns TEXT[];

	_normal_other_columns TEXT[];

	_finalized_other_columns TEXT[];

	_finalizedagg_other_columns TEXT[];

    _normal_column_list TEXT[];

    _normal_select_list TEXT[];

	_finalized_column_list TEXT[];

    _finalized_select_list TEXT[];

	_finalizedagg_column_list TEXT[];

    _finalizedagg_select_list TEXT[];

	_normal_column_list_text TEXT;

    _normal_select_list_text TEXT;

	_finalized_column_list_text TEXT;

    _finalized_select_list_text TEXT;

	_finalizedagg_column_list_text TEXT;

    _finalizedagg_select_list_text TEXT;





BEGIN

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



 RAISE NOTICE 'Tables defined'; 



    start_time := NOW();



    -- Define column arrays

    _multiplier_columns := ARRAY['promo_spend', 'sales_units', 'revenue', 'margin', 

         'affinity_revenue', 'cannibalization_revenue', 

        'pull_forward_revenue', 'affinity_margin', 'cannibalization_margin', 'pull_forward_margin',

        'contribution_revenue', 'contribution_margin',

        'coupon_spend'];



    _baseline_multiplier_columns := ARRAY['baseline_sales_units', 'baseline_revenue', 'baseline_margin'

                                      	];

 RAISE NOTICE 'Columns defined'	;	

-- ... existing code ...

    -- Build column lists for queries
    _column_list := '';
    _select_list := '';

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
    _incremental_columns := ARRAY['incremental_sales_units', 'incremental_revenue', 'incremental_margin'

                                 ];

    FOREACH _column IN ARRAY _incremental_columns LOOP
        _column_list := _column_list || _column || ', ';
        IF _column = 'incremental_sales_units' THEN
            _select_list := _select_list || '(sales_units * ' || _multiplier || ') - (baseline_sales_units * ' || _baseline_multiplier || ') AS ' || _column || ', ';
        ELSIF _column = 'incremental_revenue' THEN
            _select_list := _select_list || '(revenue * ' || _multiplier || ') - (baseline_revenue * ' || _baseline_multiplier || ') AS ' || _column || ', ';
        ELSIF _column = 'incremental_margin' THEN
            _select_list := _select_list || '(margin * ' || _multiplier || ') - (baseline_margin * ' || _baseline_multiplier || ') AS ' || _column || ', ';
--        ELSIF _column = 'incremental_revenue_with_vat' THEN
--            _select_list := _select_list || '(revenue_with_vat * ' || _multiplier || ') - (baseline_revenue_with_vat * ' || _baseline_multiplier || ') AS ' || _column || ', ';
--        ELSIF _column = 'incremental_margin_with_vat' THEN
--            _select_list := _select_list || '(margin_with_vat * ' || _multiplier || ') - (baseline_margin_with_vat * ' || _baseline_multiplier || ') AS ' || _column || ', ';
        END IF;
    END LOOP;

    _normal_other_columns := ARRAY ['event_id', 'promo_id', 'scenario_id', 'product_id', 'recommendation_date', 'customer_reco_level',
        'discount_level_value', 'offer_type_id', 'effective_discount', 'original_cost', 
        'discounted_price',  'created_by', 'updated_by', 'created_at', 'updated_at',
        'vat_percentage', 'currency_id', 'store_reco_level' ];
		
    -- FIX: Use actual column list values, not string literals
    _normal_column_list_text := _column_list;
    _normal_select_list_text := _select_list;
	
    -- Add other columns (no multiplication)
    FOREACH _column IN ARRAY _normal_other_columns LOOP
        _normal_column_list_text := _normal_column_list_text || _column || ', ';
        _normal_select_list_text := _normal_select_list_text || _column || ', ';
    END LOOP;

    _finalized_other_columns := ARRAY['event_id', 'promo_id', 'product_id', 'recommendation_date', 'customer_reco_level',
        'discount_level_value', 'offer_type_id', 'effective_discount', 'original_cost', 
        'discounted_price',  'created_by', 'updated_by', 'created_at', 'updated_at',
        'vat_percentage', 'currency_id', 'store_reco_level' ];
	
    -- FIX: Use actual column list values
    _finalized_column_list_text := _column_list;
    _finalized_select_list_text := _select_list;
	
    -- Add other columns (no multiplication)
    FOREACH _column IN ARRAY _finalized_other_columns LOOP
        _finalized_column_list_text := _finalized_column_list_text || _column || ', ';
        _finalized_select_list_text := _finalized_select_list_text || _column || ', ';
    END LOOP;

    _finalizedagg_other_columns := ARRAY['event_id', 'promo_ids', 'product_id', 'recommendation_date', 'customer_reco_level',
        'discount_level_value', 'offer_type_id', 'effective_discount', 'original_cost', 
        'discounted_price',  'created_by', 'updated_by', 'created_at', 'updated_at',
        'vat_percentage', 'currency_id', 'store_reco_level' ];
	
    -- FIX: Use actual column list values
    _finalizedagg_column_list_text := _column_list;
    _finalizedagg_select_list_text := _select_list;
	
    -- Add other columns (no multiplication)
    FOREACH _column IN ARRAY _finalizedagg_other_columns LOOP
        _finalizedagg_column_list_text := _finalizedagg_column_list_text || _column || ', ';
        _finalizedagg_select_list_text := _finalizedagg_select_list_text || _column || ', ';
    END LOOP;

    -- Remove trailing comma and space
    _normal_column_list_text := RTRIM(_normal_column_list_text, ', ');
    _normal_select_list_text := RTRIM(_normal_select_list_text, ', ');
	
    _finalized_column_list_text := RTRIM(_finalized_column_list_text, ', ');
    _finalized_select_list_text := RTRIM(_finalized_select_list_text, ', ');
	
    _finalizedagg_column_list_text := RTRIM(_finalizedagg_column_list_text, ', ');
    _finalizedagg_select_list_text := RTRIM(_finalizedagg_select_list_text, ', ');

-- ... existing code ...





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



    -- Insert new records into the normal destination table

    _query := format('

        INSERT INTO %1$s (%2$s)

        SELECT %3$s

        FROM %4$s

        WHERE promo_id = %5$s %6$s;',

        _destination_table_normal,

        _normal_column_list_text,

        _normal_select_list_text,

        _reference_table_normal,

        _promo_id,

        CASE WHEN _scenario_id != 0 THEN format('AND scenario_id = %1$s', _scenario_id) ELSE '' END

    );



    RAISE NOTICE 'Query 1: %', _query;

    EXECUTE _query;

    RAISE NOTICE 'Query 1 duration: % seconds', EXTRACT(SECOND FROM NOW() - start_time);



    -- Insert new records into the stack destination table

    _query := format('

        INSERT INTO %1$s (%2$s)

        SELECT %3$s

        FROM %4$s

        WHERE promo_id = %5$s %6$s;',

        _destination_table_stack,

        _normal_column_list_text,

        _normal_select_list_text,

        _reference_table_stack,

        _promo_id,

        CASE WHEN _scenario_id != 0 THEN format('AND scenario_id = %1$s', _scenario_id) ELSE '' END

    );



    RAISE NOTICE 'Query 2: %', _query;

    EXECUTE _query;

    RAISE NOTICE 'Query 2 duration: % seconds', EXTRACT(SECOND FROM NOW() - start_time);



    -- Insert into Finalized Override table

    _query := format('

        INSERT INTO %1$s (%2$s)

        SELECT %3$s

        FROM %4$s

        WHERE promo_id = %5$s;',

        _finalized_normal_override,

        _finalized_column_list_text,

        _finalized_select_list_text,

        _finalized_normal,

        _promo_id

    );



    RAISE NOTICE 'Query 3: %', _query;

    EXECUTE _query;

    RAISE NOTICE 'Query 3 duration: % seconds', EXTRACT(SECOND FROM NOW() - start_time);



    -- Insert into Finalized Stack Override table

    _query := format('

		delete from %1$s where (product_id, store_reco_level, customer_reco_level, recommendation_date) in

			(select distinct product_id, store_reco_level, customer_reco_level,recommendation_date from %4$s) ;

        INSERT INTO %1$s (%2$s)

        SELECT %3$s

        FROM %4$s

        WHERE promo_ids @> ARRAY[%5$s]::int4[];',

        _finalized_stack_override,

        _finalizedagg_column_list_text,

        _finalizedagg_select_list_text,

        _finalized_stack,

        _promo_id

    );



    RAISE NOTICE 'Query 4: %', _query;

    EXECUTE _query;

    RAISE NOTICE 'Query 4 duration: % seconds', EXTRACT(SECOND FROM NOW() - start_time);



    -- Refresh aggregate tables

    IF _scenario_id = 0 THEN

        CALL price_promo_opt.pc_promo_refresh_ia_agg_v1(array[_promo_id],

        ARRAY['ps_recommended_override_ia', 'ps_recommended_stack_override_ia']);

        CALL price_promo_opt.pc_promo_refresh_fin_agg_v1(array[_promo_id],

        ARRAY['ps_recommended_finalized_override', 'ps_recommended_finalized_stack_override']);

    ELSE

        CALL price_promo_opt.pc_promo_refresh_scenario_agg_v1(array[_promo_id], array[_scenario_id],

        ARRAY['ps_recommended_override', 'ps_recommended_scenarios_stack_override']);

        CALL price_promo_opt.pc_promo_refresh_fin_agg_v1(array[_promo_id],

        ARRAY['ps_recommended_finalized_override', 'ps_recommended_finalized_stack_override']);

    END IF;



END;

$function$
;