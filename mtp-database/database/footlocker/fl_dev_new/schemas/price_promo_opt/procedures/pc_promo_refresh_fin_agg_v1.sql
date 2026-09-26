--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_promo_refresh_fin_agg_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_promo_refresh_fin_agg_v1

DROP PROCEDURE if exists price_promo_opt.pc_promo_refresh_fin_agg_v1;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_promo_refresh_fin_agg_v1(IN p_promo_id integer[], IN _table_names text[] DEFAULT NULL::text[], IN _start_date date DEFAULT NULL::date, IN _end_date date DEFAULT NULL::date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$



DECLARE

    _date_filter TEXT;

    _delete_query text;

    _refresh_query text;

    _table_name text;

    _promo_filter text;

    _promo_id_column text;

    _pos_cols text;

    _pos_cols_agg text;

    -- Variables for building queries

    _column_list TEXT;

    _select_list TEXT;

    _column TEXT;

    _group_by_columns TEXT;

	_sum_columns TEXT[];

	_max_columns TEXT[];

	_avg_columns TEXT[];

BEGIN

    -- Set default values for column arrays if not provided

        _sum_columns := ARRAY[

            'promo_spend', 'sales_units', 'baseline_sales_units', 'incremental_sales_units',

            'revenue', 'baseline_revenue', 'incremental_revenue', 'margin', 'baseline_margin', 'incremental_margin',

            'affinity_revenue', 'cannibalization_revenue', 'pull_forward_revenue', 'affinity_margin',

            'cannibalization_margin', 'pull_forward_margin', 'contribution_margin', 'contribution_revenue',

            'coupon_spend'

            ];

        _max_columns := ARRAY[

            'discount_level_value', 'created_by', 'updated_by', 'created_at', 'updated_at'

        ];

        _avg_columns := ARRAY[

            'effective_discount', 'original_cost', 'discounted_price'

            ];

 -- Build column lists

        _column_list := '';

        _select_list := '';

        _group_by_columns := '';

        -- Add max aggregation columns

        FOREACH _column IN ARRAY _max_columns LOOP

            _column_list := _column_list || _column || ', ';

            _select_list := _select_list || 'MAX(' || _column || ') AS ' || _column || ', ';

        END LOOP;

        -- Add avg aggregation columns

        FOREACH _column IN ARRAY _avg_columns LOOP

            _column_list := _column_list || _column || ', ';

            _select_list := _select_list || 'AVG(' || _column || ') AS ' || _column || ', ';

        END LOOP;

        -- Add sum aggregation columns

        FOREACH _column IN ARRAY _sum_columns LOOP

            _column_list := _column_list || _column || ', ';

            _select_list := _select_list || 'SUM(' || _column || ') AS ' || _column || ', ';

        END LOOP;

         -- Add POS columns if needed

        IF _pos_cols != '' THEN

            _column_list := _column_list || _pos_cols;

            _select_list := _select_list || _pos_cols_agg;

        END IF;

    IF _table_names IS null then

        _table_names := ARRAY['ps_recommended_finalized', 'ps_recommended_finalized_stack', 'ps_recommended_finalized_override', 'ps_recommended_finalized_stack_override'];

    END IF;


    IF _start_date IS NOT NULL AND _end_date IS NOT NULL THEN

        _date_filter := FORMAT('AND recommendation_date BETWEEN %L AND %L', _start_date, _end_date);

    ELSIF _start_date IS NOT NULL THEN

        _date_filter := FORMAT('AND recommendation_date >= %L', _start_date);

    ELSIF _end_date IS NOT NULL THEN

        _date_filter := FORMAT('AND recommendation_date <= %L', _end_date);

    ELSE

        _date_filter := FORMAT('', _start_date, _end_date);

    END IF;

    FOR _table_name IN SELECT unnest(_table_names)

    LOOP

        IF _table_name = 'ps_recommended_finalized_stack' OR _table_name = 'ps_recommended_finalized_stack_override' THEN

            _promo_filter := FORMAT('WHERE promo_ids && %L', p_promo_id);

            _promo_id_column := 'event_id, promo_ids, recommendation_date,currency_id';

            _pos_cols := ', pos_baseline_sales_units, pos_baseline_revenue, pos_baseline_margin';

            _pos_cols_agg := ', SUM(pos_baseline_sales_units) as pos_baseline_sales_units, SUM(pos_baseline_revenue) as pos_baseline_revenue, SUM(pos_baseline_margin) as pos_baseline_margin';

        ELSE

            _promo_filter := FORMAT('WHERE promo_id = any(%L)', p_promo_id);

            _promo_id_column := 'event_id, promo_id, recommendation_date, currency_id';

            _pos_cols := '';

            _pos_cols_agg := '';

        END IF;

        -- Remove trailing comma and space

        _column_list := RTRIM(_column_list, ', ');

        _select_list := RTRIM(_select_list, ', ');

        _delete_query := format('DELETE FROM price_promo.%s_agg %s %s;', 

            _table_name, _promo_filter, _date_filter);

        RAISE NOTICE 'delete query for % : %', _table_name, _delete_query;

        EXECUTE _delete_query;

        -- Build and execute refresh query

        _refresh_query := FORMAT('

            INSERT INTO price_promo.%1$s_agg (%6$s, %2$s)

            SELECT %6$s, %3$s

            FROM price_promo.%1$s

            %4$s

            %5$s

            GROUP BY %6$s;',

            _table_name,

            _column_list,

            _select_list,

            _promo_filter,

            _date_filter,

            _promo_id_column

        );

        RAISE NOTICE 'refresh query for % : %', _table_name, _refresh_query;

        EXECUTE _refresh_query;

    END LOOP;

END;

$procedure$
;

