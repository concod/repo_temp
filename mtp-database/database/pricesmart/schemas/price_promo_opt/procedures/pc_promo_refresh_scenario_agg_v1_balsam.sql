--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_promo_refresh_scenario_agg_v1_balsam runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_promo_refresh_scenario_agg_v1_balsam

DROP PROCEDURE if exists price_promo_opt.pc_promo_refresh_scenario_agg_v1_balsam;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_promo_refresh_scenario_agg_v1_balsam(IN p_promo_id integer[], IN _scenario_id integer[] DEFAULT NULL::integer[], IN _table_names text[] DEFAULT NULL::text[], IN _start_date date DEFAULT NULL::date, IN _end_date date DEFAULT NULL::date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE
    _date_filter TEXT;
    _delete_query text;
    _refresh_query text;
    _table_name text;
    _column_list TEXT;
    _select_list TEXT;
    _column TEXT;
    _special_logic TEXT;
    _sum_columns TEXT[];
    _max_columns TEXT[];
    _avg_columns TEXT[];
    _no_agg_columns TEXT[];
    _special_columns TEXT[];

BEGIN
    IF _table_names IS null then
        _table_names := ARRAY['ps_recommended_scenarios', 'ps_recommended_scenarios_stack', 
                            'ps_recommended_override', 'ps_recommended_scenarios_stack_override'];
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

    -- Define column arrays
    _sum_columns := ARRAY['promo_spend', 'sales_units', 'baseline_sales_units', 'incremental_sales_units',
        'revenue', 'baseline_revenue', 'incremental_revenue', 'margin', 'baseline_margin', 'incremental_margin',
        'affinity_revenue', 'cannibalization_revenue', 'pull_forward_revenue', 'affinity_margin',
        'cannibalization_margin', 'pull_forward_margin', 'contribution_margin', 'contribution_revenue',

        'promo_spend_with_vat', 'revenue_with_vat', 'baseline_revenue_with_vat', 'incremental_revenue_with_vat', 
        'margin_with_vat', 'baseline_margin_with_vat', 'incremental_margin_with_vat',
        'affinity_revenue_with_vat', 'cannibalization_revenue_with_vat', 'pull_forward_revenue_with_vat', 
        'affinity_margin_with_vat', 'cannibalization_margin_with_vat', 'pull_forward_margin_with_vat', 
        'contribution_margin_with_vat', 'contribution_revenue_with_vat'];

    _max_columns := ARRAY['discount_level_value', 'created_by',
        'updated_by', 'created_at', 'updated_at'];

    _avg_columns := ARRAY['effective_discount', 'original_cost', 'discounted_price',

        'effective_discount_with_vat', 'original_cost_with_vat', 'discounted_price_with_vat'];

    -- These no_agg columns are also the same columns that will be used in group by
    _no_agg_columns := ARRAY['event_id', 'promo_id', 'scenario_id', 'recommendation_date', 'currency_id'];

    _special_columns := ARRAY['aur', 'aum', 'aur_with_vat', 'aum_with_vat', 'RECOMMENDATION_TYPE_ID'];

    -- Build column lists for queries
    _column_list := '';
    _select_list := '';

    -- Add no aggregation columns
    FOREACH _column IN ARRAY _no_agg_columns LOOP
        _column_list := _column_list || _column || ', ';
        _select_list := _select_list || _column || ', ';
    END LOOP;

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

    -- Add special logic columns
    FOREACH _column IN ARRAY _special_columns LOOP
        _column_list := _column_list || _column || ', ';
        IF _column = 'aur' THEN
            _select_list := _select_list || 'coalesce(sum(revenue) / nullif(sum(sales_units), 0), 0) AS aur, ';
        ELSIF _column = 'aum' THEN
            _select_list := _select_list || 'coalesce(sum(margin) / nullif(sum(sales_units), 0), 0) AS aum, ';
        ELSIF _column = 'aur_with_vat' THEN
            _select_list := _select_list || 'coalesce(sum(revenue_with_vat) / nullif(sum(sales_units), 0), 0) AS aur_with_vat, ';
        ELSIF _column = 'aum_with_vat' THEN
            _select_list := _select_list || 'coalesce(sum(margin_with_vat) / nullif(sum(sales_units), 0), 0) AS aum_with_vat, ';
        ELSIF _column = 'RECOMMENDATION_TYPE_ID' THEN
            _select_list := _select_list || '0 AS RECOMMENDATION_TYPE_ID, ';
        END IF;
    END LOOP;

    -- Remove trailing comma and space
    _column_list := RTRIM(_column_list, ', ');
    _select_list := RTRIM(_select_list, ', ');

    FOR _table_name IN SELECT unnest(_table_names)
    LOOP
        _delete_query = format('DELETE FROM price_promo.%s_agg
                                WHERE scenario_id = ANY(%L)
                                %s;', _table_name, _scenario_id, _date_filter);

        RAISE NOTICE 'delete query for %_agg  : %', _table_name, _delete_query;
        execute _delete_query;

        _refresh_query = FORMAT('
            INSERT INTO price_promo.%1$s_agg (%2$s)
            SELECT %3$s
            FROM
                (select * from price_promo.%1$s
                WHERE scenario_id = any(%4$L)
                %5$s) sub2
            GROUP BY %6$s;',
            _table_name,
            _column_list,
            _select_list,
            _scenario_id,
            _date_filter,
            _no_agg_columns[1] || ', ' || _no_agg_columns[2] || ', ' || _no_agg_columns[3] || ', ' || _no_agg_columns[4] || ', ' || _no_agg_columns[5]
        );

        RAISE NOTICE 'refresh query for %_agg : %', _table_name, _refresh_query;
        execute _refresh_query;
    END LOOP;

END;
$procedure$



;