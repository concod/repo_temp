--liquibase formatted sql
--changeset nikhil.shet@impactanalytics.co:fn_dd_total_business_report runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Function to get Total Business Report data with dynamic time aggregation

DROP FUNCTION IF EXISTS price_promo.fn_dd_total_business_report;

CREATE OR REPLACE FUNCTION price_promo.fn_dd_total_business_report(_time_level integer, _start_date date, _end_date date, product_hierarchy_levels integer[], _product_filters jsonb DEFAULT NULL::jsonb, _download_flag integer DEFAULT 0, _target_currency_id integer DEFAULT 1::integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
-- Purpose – Generates a comprehensive Total Business Report with dynamic time aggregation and detailed JSON output
-- 
-- Example – SELECT price_promo.fn_dd_total_business_report(
--    1, -- _time_level: 0=daily, 1=weekly, 2=monthly, 3=quarterly
--    '2023-01-01', -- _start_date
--    '2023-12-31', -- _end_date
--    ARRAY[0, 1, 2], -- product_hierarchy_levels
--    '{"brand": ["BrandA", "BrandB"]}', -- _product_filters (optional)
--    0, -- _download_flag (optional)
--    1 -- _target_currency_id (optional)
-- );
-- 
-- Other Functions Used:
-- * price_promo.fn_get_product_hierarchy_columns - Gets product hierarchy column names
-- * price_promo.fn_get_product_hierarchy_columns_for_json - Gets product hierarchy column names for JSON
-- * price_promo.fn_get_time_hierarchy_column - Gets time hierarchy column name
-- 
-- Tables Used:
-- * price_promo.product_master - Contains product hierarchy information
-- * price_promo.tb_tool_configurations - Contains hierarchy configuration for filtering
-- * price_promo_opt.tb_simulation_week_opt - Source for baseline forecast data
-- * price_promo.ps_recommended_finalized_stack - Source for promotional forecast data
-- * price_markdown.tb_ssd_fin - Source for markdown forecast data
-- * price_promo.tb_actuals_data - Source for actual sales data
-- * price_promo.tb_ly_actuals_data - Source for last year actual sales data
-- * global.planned_forex_rate - Source for currency conversion rates
-- * price_markdown.tb_approval_metrics - Contains approval metrics for markdown strategies
-- * price_markdown.tb_strategy_master - Contains strategy information and status
-- 
-- Returns – A JSON object containing hierarchical metrics for total business reporting, including:
--   * Total metrics (sales units, revenue, margin, margin percentage)
--   * Baseline metrics (sales units, revenue, margin, margin percentage)
--   * Promo metrics (sales units, revenue, margin, margin percentage)
--   * Markdown metrics (sales units, revenue, margin, margin percentage)
--   * Actuals metrics (sales units, revenue, margin, margin percentage)
--   * Last Year metrics (sales units, revenue, margin, margin percentage)
--   * Most Frequent Price metrics (sales units, revenue, margin, margin percentage)

	result json;
    date_format text;
    time_period_format text;
    query_text text;
    _strategy_ids INTEGER[];
    _product_hierarchy_config jsonb;
    _key text;
    _value INTEGER[];
    _column_name text;
    temp_string_where_condition text;
    product_columns text;
    json_product_columns text;
    time_column text;
    time_column_json text;
    _currency_name text;
    _currency_symbol text;
    product_select text;
	product_select_imputed text;
    -- Variables for maintaining JSON key ordering
    product_key_array text[];
    time_key_array text[];
    json_ordering_array text[];
    json_ordering_string text;
    -- Temporary suffix for naming unlogged temp tables
    temp_suffix text;
    -- Names for UNLOGGED temp tables
    pmf_tbl text;  -- product_master_filtered
    fdm_tbl text;  -- fiscal_date_mapping
    cr_tbl  text;  -- currency_rates
	fdc_tbl text;  -- Fiscal date Currency table
    bf_tbl  text;  -- baseline_forecast
    pf_tbl  text;  -- promo_forecast
    mf_tbl  text;  -- markdown_forecast
    aty_tbl text;  -- actuals_ty_data
    aly_tbl text;  -- actuals_ly_data
    mfp_tbl text;  -- mfp_data
 	apd_tbl text;  -- all product date table
    pdm_tbl text;  -- product date metrics table
    _query text;
    _start_date_ly date := _start_date - 372;
    _end_date_ly date := _end_date - 358;
    start_time timestamp;
    end_time timestamp;
BEGIN
   

    -- Initialize currency variables
    SELECT currency_name, currency_symbol INTO _currency_name, _currency_symbol
    FROM global.tb_currency_master
    WHERE currency_id = _target_currency_id;
    
    
    -- Get strategy IDs for the date range
    SELECT ARRAY_AGG(strategy_id) INTO _strategy_ids
    FROM price_markdown.tb_strategy_master
    WHERE start_date <= _end_date
    AND end_date >= _start_date
    AND status IN (1, 2, 3, 4, 6);
    
    -- If no approved strategies found, use a default array to avoid null issues
    IF _strategy_ids IS NULL THEN
        _strategy_ids := '{}'::INTEGER[];
    END IF;
    
    RAISE NOTICE 'Using strategy IDs: %', _strategy_ids;
    
    -- Get product hierarchy configuration
    SELECT config_value::jsonb INTO _product_hierarchy_config
    FROM price_promo.tb_tool_configurations
    WHERE module = 'product' AND config_name = 'hierarchy_filters';
    
    -- Initialize where condition string
    temp_string_where_condition := '';
    
    -- Update the where condition with product filters
    IF _product_filters IS NOT NULL THEN
        FOR _key IN SELECT * FROM jsonb_object_keys(_product_filters) LOOP
            _value := (SELECT array_agg(val::INTEGER)
                      FROM jsonb_array_elements(_product_filters -> _key) val);
    
            IF array_length(_value, 1) > 0 THEN
                _column_name := _product_hierarchy_config -> _key ->> 'id_column';
    
                IF _column_name IS NOT NULL THEN
                    temp_string_where_condition := temp_string_where_condition ||
                        ' AND pm.' || quote_ident(_column_name) ||
                        ' IN (' || array_to_string(_value, ', ') || ')';
                ELSE
                     RAISE WARNING '[PRODUCT FILTER] Key "%" not found in product_hierarchy_levels or lacks an "id_column".', _key;
                END IF;
            END IF;
        END LOOP;
    END IF;

    -- Log the where condition for debugging
    RAISE NOTICE 'Product filter where condition: %', temp_string_where_condition;
    

    product_columns := price_promo_opt.fn_reporting_r1_get_hierarchy_names(product_hierarchy_levels, 'product', ARRAY[]::text[]);
    json_product_columns := price_promo_opt.fn_reporting_r1_get_hierarchy_names_for_json(product_hierarchy_levels, 'product', ARRAY[]::text[]);
    product_select := CASE WHEN product_columns IS NOT NULL AND product_columns <> '' THEN product_columns || ', ' ELSE '' end;
    product_select_imputed := price_promo_opt.fn_reporting_r1_get_hierarchy_names(product_hierarchy_levels, 'product', ARRAY[]::text[], false, true);

    -- Time filter condition
    IF _time_level = 0 THEN
        time_column := 'fiscal_year, fiscal_week, fiscal_month, fiscal_quarter, date, week_start_date';
        time_column_json := ' ''Fiscal Year'',fiscal_year, ''Fiscal Week'',fiscal_week, ''Fiscal Month'',fiscal_month, ''Fiscal Quarter'',fiscal_quarter, ''Date'',date, ''Week Start Date'',week_start_date';
    ELSIF _time_level = 1 THEN
        time_column := 'fiscal_year, fiscal_week, fiscal_month, fiscal_quarter, week_start_date';
        time_column_json := ' ''Fiscal Year'',fiscal_year, ''Fiscal Week'',fiscal_week, ''Fiscal Month'',fiscal_month, ''Fiscal Quarter'',fiscal_quarter, ''Week Start Date'',week_start_date';
    ELSIF _time_level = 2 THEN
        time_column := 'fiscal_year, fiscal_month, fiscal_quarter';
        time_column_json := ' ''Fiscal Year'',fiscal_year, ''Fiscal Month'',fiscal_month, ''Fiscal Quarter'',fiscal_quarter';
    ELSE    
        time_column := 'fiscal_year, fiscal_quarter';
        time_column_json := ' ''Fiscal Year'',fiscal_year, ''Fiscal Quarter'',fiscal_quarter';
    END IF;

    RAISE notice 'product_columns %', product_columns;
    RAISE notice 'product_select %', product_select;
	RAISE notice 'product_select_imputed %', product_select_imputed;
    RAISE notice 'json_product_columns %', json_product_columns;
    RAISE notice 'time_column %', time_column;

    -- Build json_ordering array to preserve key insertion order for download workflows
    -- 1. Extract keys from dynamic product hierarchy columns
    SELECT COALESCE(array_agg(match[1]), ARRAY[]::text[]) INTO product_key_array
    FROM regexp_matches(json_product_columns, '''([^'']+)''', 'g') AS match;

    -- 2. Extract keys from dynamic time hierarchy columns
    SELECT COALESCE(array_agg(match[1]), ARRAY[]::text[]) INTO time_key_array
    FROM regexp_matches(time_column_json, '''([^'']+)''', 'g') AS match;

    -- 3. Combine all keys in the same order as they will be inserted in json_build_object
    json_ordering_array := product_key_array || time_key_array || ARRAY[
        'Currency Name','Currency Symbol',
        'Forecasted Units','Forecasted Revenue','Forecasted Margin','Forecasted Margin Percentage',
        'Actual Units','Actual Revenue','Actual Margin','Actual Margin Percentage',
        'LY Units','LY Revenue','LY Margin','LY Margin Percentage',
        'Plan Units','Plan Revenue','Plan Margin','Plan Margin Percentage',
        'Forecasted Baseline Units','Forecasted Baseline Revenue','Forecasted Baseline Margin','Forecasted Baseline Margin Percentage',
        'Forecasted Promo Units','Forecasted Promo Revenue','Forecasted Promo Margin','Forecasted Promo Margin Percentage',
        'Forecasted Markdown Units','Forecasted Markdown Revenue','Forecasted Markdown Margin','Forecasted Markdown Margin Percentage'
    ];

    -- 4. Prepare a json_build_array string representation for dynamic SQL injection
    json_ordering_string := 'json_build_array(''' || array_to_string(json_ordering_array, ''',''' ) || ''')';

    RAISE NOTICE 'JSON ordering: %', json_ordering_string;

    -- Generate temp table suffix from current timestamp (epoch milliseconds)
    temp_suffix := ((extract(epoch from clock_timestamp())*1000)::bigint)::text;
    RAISE NOTICE 'Temp suffix: %', temp_suffix;

    -- Compose table names
    pmf_tbl := 'product_master_filtered_' || temp_suffix;
    fdm_tbl := 'fiscal_date_mapping_' || temp_suffix;
    cr_tbl  := 'currency_rates_' || temp_suffix;
	fdc_tbl  := 'fiscal_date_currency_' || temp_suffix;
    bf_tbl  := 'baseline_forecast_' || temp_suffix;
    pf_tbl  := 'promo_forecast_' || temp_suffix;
    mf_tbl  := 'markdown_forecast_' || temp_suffix;
    aty_tbl := 'actuals_ty_data_' || temp_suffix;
    aly_tbl := 'actuals_ly_data_' || temp_suffix;
    mfp_tbl := 'mfp_data_' || temp_suffix;
	apd_tbl := 'all_product_date_' || temp_suffix;
    pdm_tbl := 'product_date_metrics_' || temp_suffix;

    -- 1) product_master_filtered
    _query := format('
        DROP TABLE IF EXISTS price_promo_opt_temp.%I; 
        CREATE UNLOGGED TABLE price_promo_opt_temp.%I AS 
        SELECT pm.product_id, pm.currency_id, %s
		FROM price_promo.product_master pm 
        WHERE 1=1 %s;
        
        CREATE INDEX idx_pmf_product_id_%s 
        ON price_promo_opt_temp.%I using btree(product_id);
        ',
        pmf_tbl,
        pmf_tbl,
		product_select_imputed,
        temp_string_where_condition,
        temp_suffix,
        pmf_tbl
    );
    raise notice 'Product Master Filtered  ----- %', _query;
    start_time := clock_timestamp();
    execute _query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken Product Master Filtered : %', end_time - start_time;

    -- 2) fiscal_date_mapping
    _query := format('
        DROP TABLE IF EXISTS price_promo_opt_temp.%I; 
        CREATE UNLOGGED TABLE price_promo_opt_temp.%I AS 
        SELECT 
            date_id AS date, 
            fiscal_year, 
            fiscal_week, 
            fiscal_month, 
            fiscal_quarter,
            fiscal_fd_week AS week_start_date, 
            ly_date,
            concat(''FW'', fiscal_week, '' '', fiscal_year) AS fiscal_week_label,
            concat(''FM'', fiscal_month, '' '', fiscal_year) AS fiscal_month_label,
            concat(''FQ'', fiscal_quarter, '' '', fiscal_year) AS fiscal_quarter_label
        FROM 
            global.tb_fiscal_date_mapping tfdm 
        WHERE 
            date_id BETWEEN %L AND %L;
            
        CREATE INDEX idx_fdm_date_%s ON price_promo_opt_temp.%I using btree("date");
        CREATE INDEX idx_fdm_ly_date_%s ON price_promo_opt_temp.%I using btree(ly_date);
        ',
        fdm_tbl,
        fdm_tbl,
        _start_date,
        _end_date,
        temp_suffix,
        fdm_tbl,
        temp_suffix,
        fdm_tbl
    );
    raise notice 'Fiscal Date Mapping ----- %', _query;
    start_time := clock_timestamp();
    execute _query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken Fiscal Date Mapping: %', end_time - start_time;

    -- 3) currency_rates
    _query := format('
        DROP TABLE IF EXISTS price_promo_opt_temp.%I; 
        CREATE UNLOGGED TABLE price_promo_opt_temp.%I AS 
        SELECT 
            pfr.date, 
            pfr.source_currency_id AS currency_id, 
            pfr.planned_conversion_multiplier AS planned_rate, 
            afr.planned_conversion_multiplier AS actual_rate
        FROM 
            global.planned_forex_rate pfr 
        LEFT JOIN 
            global.actual_forex_rate afr 
        ON 
            afr.date = pfr.date AND 
            afr.source_currency_id = pfr.source_currency_id 
        WHERE 
            pfr.date BETWEEN %L AND %L AND 
            pfr.target_currency_id = %L AND 
            afr.target_currency_id = %L ;
            
        CREATE INDEX idx_cr_currency_date_%s ON price_promo_opt_temp.%I (currency_id, "date");
        ',
        cr_tbl, cr_tbl, _start_date, _end_date, _target_currency_id, _target_currency_id,
        temp_suffix, cr_tbl
    );
    raise notice 'Currency Rates ----- %', _query;
    start_time := clock_timestamp();
    execute _query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken Currency Rates: %', end_time - start_time;


	 -- 3.5) Fiscal date Currency ratecurrency_rates
    _query := format('
        DROP TABLE IF EXISTS price_promo_opt_temp.%I; 
        CREATE UNLOGGED TABLE price_promo_opt_temp.%I AS 
        SELECT 
		fdm.*, cr.currency_id, cr.planned_rate, cr.actual_rate
        from price_promo_opt_temp.%I fdm
        inner join price_promo_opt_temp.%I cr
        on fdm.date = cr.date ;
            
        CREATE INDEX idx_fdc_%s ON price_promo_opt_temp.%I (currency_id, ly_date);
        ',
        fdc_tbl, fdc_tbl, fdm_tbl, cr_tbl, temp_suffix, fdc_tbl
    );
    raise notice 'Currency Rates ----- %', _query;
    start_time := clock_timestamp();
    execute _query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken Currency Rates: %', end_time - start_time;

    -- 4) baseline_forecast
    _query := format('
        DROP TABLE IF EXISTS price_promo_opt_temp.%I; 
        CREATE UNLOGGED TABLE price_promo_opt_temp.%I AS 
        SELECT 
            sm.product_id, 
            sm.dates AS date, 
            sum(coalesce(units, 0)) AS baseline_sales_units, 
            sum(coalesce(revenue * planned_rate, 0)) AS baseline_revenue, 
            sum(coalesce(margin * planned_rate, 0)) AS baseline_margin
        FROM 
            price_promo_opt.tb_budget_master_baseline_agg sm 
        INNER JOIN 
            price_promo_opt_temp.%I pmf ON sm.product_id = pmf.product_id 
        INNER JOIN 
            price_promo_opt_temp.%I cr ON sm.dates = cr.date AND pmf.currency_id = cr.currency_id 
        WHERE 
            sm.dates BETWEEN %L AND %L
        GROUP BY 
            1, 2;
            
        CREATE INDEX idx_bf_product_date_%s ON price_promo_opt_temp.%I using btree(product_id, "date");
        ',
        bf_tbl, bf_tbl, pmf_tbl, cr_tbl, _start_date, _end_date, temp_suffix,bf_tbl
    );
    raise notice 'Baseline Forecast ----- %', _query;
    start_time := clock_timestamp();
    execute _query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken Baseline Forecast: %', end_time - start_time;

    -- 5) promo_forecast
    _query := format('
        DROP TABLE IF EXISTS price_promo_opt_temp.%I; 
        CREATE UNLOGGED TABLE price_promo_opt_temp.%I AS 
        SELECT 
            f.product_id, 
            recommendation_date AS date, 
            max(coalesce(sales_units, 0)) AS promo_sales_units, 
            max(coalesce(revenue * planned_rate, 0)) AS promo_revenue, 
            max(coalesce(margin * planned_rate, 0)) AS promo_margin
        FROM 
            price_promo.ps_recommended_finalized_stack f 
        INNER JOIN 
            price_promo_opt_temp.%I pmf ON f.product_id = pmf.product_id 
        INNER JOIN 
            price_promo_opt_temp.%I cr ON f.recommendation_date = cr.date AND pmf.currency_id = cr.currency_id 
        WHERE 
            f.recommendation_date BETWEEN %L AND %L
        GROUP BY 
            1, 2;
            
        CREATE INDEX idx_pf_product_date_%s ON price_promo_opt_temp.%I using btree(product_id, "date");
        ',
        pf_tbl, pf_tbl, pmf_tbl, cr_tbl, _start_date, _end_date, temp_suffix, pf_tbl
    );
    raise notice 'Promo Forecast ----- %', _query;
    start_time := clock_timestamp();
    execute _query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken Promo Forecast: %', end_time - start_time;

    -- 6) markdown_forecast
    _query := format('
        DROP TABLE IF EXISTS price_promo_opt_temp.%I; 
        CREATE UNLOGGED TABLE price_promo_opt_temp.%I AS 
        SELECT 
            fin.product_id, 
            fin.recommendation_date AS date, 
            max(coalesce(fin.sales_units, 0)) AS markdown_sales_units, 
            max(coalesce(fin.revenue * planned_rate, 0)) AS markdown_revenue, 
            max(coalesce(fin.margin * planned_rate, 0)) AS markdown_margin
        FROM 
            price_markdown.tb_ssd_fin fin 
        INNER JOIN 
            price_markdown.tb_approval_metrics am 
            ON fin.product_level_id = am.product_level_id 
            AND fin.pcd_id = am.pcd_id 
            AND fin.strategy_id = am.strategy_id 
        INNER JOIN 
            price_promo_opt_temp.%I pmf ON fin.product_id = pmf.product_id 
        INNER JOIN 
            price_promo_opt_temp.%I cr ON fin.recommendation_date = cr.date AND pmf.currency_id = cr.currency_id 
        WHERE 
            fin.recommendation_date BETWEEN %L AND %L 
            %s
        GROUP BY 
            1, 2;
            
        CREATE INDEX idx_mf_product_date_%s ON price_promo_opt_temp.%I using btree(product_id, "date");
        ',
        mf_tbl,mf_tbl, pmf_tbl, cr_tbl, _start_date, _end_date,
        CASE WHEN _strategy_ids IS NOT NULL AND array_length(_strategy_ids,1) > 0 
            THEN format('AND fin.strategy_id = ANY(ARRAY[%s]) ', array_to_string(_strategy_ids, ','))
            ELSE ''
        END,
        temp_suffix,
        mf_tbl
    );
    raise notice 'Markdown Forecast ----- %', _query;
    start_time := clock_timestamp();
    execute _query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken Markdown Forecast: %', end_time - start_time;

    -- 7) actuals_ty_data
    _query := format('
        DROP TABLE IF EXISTS price_promo_opt_temp.%I; 
        CREATE UNLOGGED TABLE price_promo_opt_temp.%I AS 
        SELECT 
            txn.product_id, 
            txn.date_id AS date, 
            sum(coalesce(quantity, 0)) AS actual_sales_units, 
            sum(coalesce(revenue * actual_rate, 0)) AS actual_revenue, 
            sum(coalesce(margin * actual_rate, 0)) AS actual_margin
        FROM 
            price_promo_opt.promo_txn_agg txn 
        INNER JOIN 
            price_promo_opt_temp.%I pmf ON txn.product_id = pmf.product_id 
        INNER JOIN 
            price_promo_opt_temp.%I cr ON txn.date_id = cr.date AND pmf.currency_id = cr.currency_id 
        WHERE 
            txn.date_id BETWEEN %L AND %L
        GROUP BY 
            1, 2;
            
        CREATE INDEX idx_aty_product_date_%s ON price_promo_opt_temp.%I using btree(product_id, "date");
        ',
        aty_tbl, aty_tbl, pmf_tbl,cr_tbl, _start_date, _end_date, temp_suffix, aty_tbl
    );
    raise notice 'Actuals TY Data ----- %', _query;
    start_time := clock_timestamp();
    execute _query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken Actuals TY Data: %', end_time - start_time;

    -- 8) actuals_ly_data
    _query := format('
        DROP TABLE IF EXISTS price_promo_opt_temp.%I; 
        CREATE UNLOGGED TABLE price_promo_opt_temp.%I AS 
		SELECT 
            txn.product_id, 
            fdc.date AS date, 
            sum(coalesce(quantity, 0)) AS ly_sales_units, 
            sum(coalesce(revenue * planned_rate, 0)) AS ly_revenue, 
            sum(coalesce(margin * planned_rate, 0)) AS ly_margin
        FROM 
            price_promo_opt.promo_txn_agg txn 
        INNER JOIN 
            price_promo_opt_temp.%I fdc ON txn.date_id = fdc.ly_date 
        INNER JOIN 
            price_promo_opt_temp.%I pmf ON txn.product_id = pmf.product_id and pmf.currency_id = fdc.currency_id

        WHERE txn.date_id BETWEEN %L AND %L
        GROUP BY 
            1, 2;
		CREATE INDEX idx_aly_product_date_%s ON price_promo_opt_temp.%I using btree(product_id, "date");
        ',
        aly_tbl, aly_tbl, fdc_tbl, pmf_tbl, _start_date_ly, _end_date_ly, temp_suffix, aly_tbl
    );
    raise notice 'Actuals LY Data ----- %', _query;
    start_time := clock_timestamp();
    execute _query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken Actuals LY Data: %', end_time - start_time;

    -- 9) mfp_data
    _query := format('
        DROP TABLE IF EXISTS price_promo_opt_temp.%I; 
        CREATE UNLOGGED TABLE price_promo_opt_temp.%I AS 
        SELECT 
            mfp.product_id, 
            mfp.dates AS date, 
            sum(coalesce(units, 0)) AS mfp_sales_units, 
            sum(coalesce(revenue * planned_rate, 0)) AS mfp_revenue, 
            sum(coalesce(margin * planned_rate, 0)) AS mfp_margin
        FROM 
            price_promo_opt.tb_budget_master_ty_agg mfp 
        INNER JOIN 
            price_promo_opt_temp.%I pmf ON mfp.product_id = pmf.product_id 
        INNER JOIN 
            price_promo_opt_temp.%I cr ON mfp.dates = cr.date AND pmf.currency_id = cr.currency_id 
        WHERE 
            mfp.dates BETWEEN %L AND %L
        GROUP BY 
            1, 2;
            
        CREATE INDEX idx_mfp_product_date_%s ON price_promo_opt_temp.%I using btree(product_id, "date");
        ',
        mfp_tbl, mfp_tbl, pmf_tbl, cr_tbl, _start_date, _end_date, temp_suffix, mfp_tbl
    );
    raise notice 'MFP Data ----- %', _query;
    start_time := clock_timestamp();
    execute _query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken MFP Data: %', end_time - start_time;
	

 	-- 9.5 Necessary Product date combination
	_query := format('
        DROP TABLE IF EXISTS price_promo_opt_temp.%I;

		CREATE UNLOGGED TABLE price_promo_opt_temp.%I AS

		SELECT product_id, date FROM price_promo_opt_temp.%I
		UNION
		SELECT product_id, date FROM price_promo_opt_temp.%I
		UNION
		SELECT product_id, date FROM price_promo_opt_temp.%I
		UNION
		SELECT product_id, date FROM price_promo_opt_temp.%I
		UNION
		SELECT product_id, date FROM price_promo_opt_temp.%I
		UNION
		SELECT product_id, date FROM price_promo_opt_temp.%I;
            
        CREATE INDEX idx_apd_product_date_%s ON price_promo_opt_temp.%I using btree(product_id, "date");
        ',
        apd_tbl, apd_tbl, bf_tbl, pf_tbl, mf_tbl, aty_tbl, aly_tbl, mfp_tbl, temp_suffix, apd_tbl
    );
    raise notice 'Common Product Date ----- %', _query;
    start_time := clock_timestamp();
    execute _query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken Product Date: %', end_time - start_time;


	 
    --Final Product date metrics table
    _query := format('
        DROP TABLE IF EXISTS price_promo_opt_temp.%I; 
        CREATE UNLOGGED TABLE price_promo_opt_temp.%I AS 
        SELECT
            apd.product_id,
            %L as target_currency_id,
            %s,
            apd.date,
            apd.fiscal_week,
            apd.fiscal_month,
            apd.fiscal_quarter,
            apd.fiscal_year,
            apd.week_start_date,
            apd.fiscal_week_label,
            apd.fiscal_month_label,
            apd.fiscal_quarter_label,
            COALESCE(bf.baseline_sales_units, 0) as baseline_sales_units,
            COALESCE(bf.baseline_revenue, 0) as baseline_revenue,
            COALESCE(bf.baseline_margin, 0) as baseline_margin,

            COALESCE(pf.promo_sales_units, 0) as promo_sales_units,
            COALESCE(pf.promo_revenue, 0) as promo_revenue,
            COALESCE(pf.promo_margin, 0) as promo_margin,

            COALESCE(mf.markdown_sales_units, 0) as markdown_sales_units,
            COALESCE(mf.markdown_revenue, 0) as markdown_revenue,
            COALESCE(mf.markdown_margin, 0) as markdown_margin,

            COALESCE(ad.actual_sales_units, 0) as actual_sales_units,
            COALESCE(ad.actual_revenue, 0) as actual_revenue,
            COALESCE(ad.actual_margin, 0) as actual_margin,

            COALESCE(lyd.ly_sales_units, 0) as ly_sales_units,
            COALESCE(lyd.ly_revenue, 0) as ly_revenue,
            COALESCE(lyd.ly_margin, 0) as ly_margin,

            COALESCE(mfp.mfp_sales_units, 0) as mfp_sales_units,
            COALESCE(mfp.mfp_revenue, 0) as mfp_revenue,
            COALESCE(mfp.mfp_margin, 0) as mfp_margin,

            COALESCE(CASE
                WHEN COALESCE(baseline_sales_units,0) >= COALESCE(promo_sales_units,0) 
                AND  COALESCE(baseline_sales_units,0) >= COALESCE(markdown_sales_units,0) 
                    THEN COALESCE(baseline_sales_units,0)
                WHEN COALESCE(promo_sales_units,0) >= COALESCE(baseline_sales_units,0)
                AND COALESCE(promo_sales_units,0) >= COALESCE(markdown_sales_units,0) 
                    THEN COALESCE(promo_sales_units,0)
                ELSE COALESCE(markdown_sales_units,0)
            END, 0) as total_sales_units,
            
            COALESCE(CASE
                WHEN COALESCE(baseline_sales_units,0) >= COALESCE(promo_sales_units,0) 
                AND  COALESCE(baseline_sales_units,0) >= COALESCE(markdown_sales_units,0) 
                    THEN COALESCE(bf.baseline_revenue, 0)
                WHEN COALESCE(promo_sales_units,0) >= COALESCE(baseline_sales_units,0)
                AND COALESCE(promo_sales_units,0) >= COALESCE(markdown_sales_units,0) 
                    THEN COALESCE(pf.promo_revenue, 0)
                ELSE COALESCE(mf.markdown_revenue, 0)
            END, 0) as total_revenue,
            
            COALESCE(CASE
                WHEN COALESCE(baseline_sales_units,0) >= COALESCE(promo_sales_units,0) 
                AND  COALESCE(baseline_sales_units,0) >= COALESCE(markdown_sales_units,0) 
                    THEN COALESCE(bf.baseline_margin, 0)
                WHEN COALESCE(promo_sales_units,0) >= COALESCE(baseline_sales_units,0)
                AND COALESCE(promo_sales_units,0) >= COALESCE(markdown_sales_units,0) 
                    THEN COALESCE(pf.promo_margin, 0)
                ELSE COALESCE(mf.markdown_margin, 0)
            END, 0) as total_margin,

            CASE
                WHEN COALESCE(baseline_sales_units,0) >= COALESCE(promo_sales_units,0) 
                AND  COALESCE(baseline_sales_units,0) >= COALESCE(markdown_sales_units,0) 
                    THEN 0
                WHEN COALESCE(promo_sales_units,0) >= COALESCE(baseline_sales_units,0)
                AND COALESCE(promo_sales_units,0) >= COALESCE(markdown_sales_units,0) 
                    THEN 1
                ELSE 2
            END as total_flag
        FROM 
		    (select * from price_promo_opt_temp.%I apd
        INNER JOIN  
			price_promo_opt_temp.%I pmf using(product_id) -- move to product master filtered
			 INNER JOIN 
			price_promo_opt_temp.%I fm using(date)
			)apd
		LEFT JOIN 
            price_promo_opt_temp.%I bf ON apd.product_id = bf.product_id AND apd.date = bf.date
        LEFT JOIN 
            price_promo_opt_temp.%I pf ON apd.product_id = pf.product_id AND apd.date = pf.date
        LEFT JOIN 
            price_promo_opt_temp.%I mf ON apd.product_id = mf.product_id AND apd.date = mf.date
        LEFT JOIN 
            price_promo_opt_temp.%I ad ON apd.product_id = ad.product_id AND apd.date = ad.date
        LEFT JOIN 
            price_promo_opt_temp.%I lyd ON apd.product_id = lyd.product_id AND apd.date = lyd.date
        LEFT JOIN 
            price_promo_opt_temp.%I mfp ON apd.product_id = mfp.product_id AND apd.date = mfp.date
        WHERE 
        COALESCE(bf.baseline_sales_units,0) >0 
        OR COALESCE(pf.promo_sales_units,0) >0 
        OR COALESCE(mf.markdown_sales_units,0) >0 
        OR COALESCE(ad.actual_sales_units,0) >0 
        OR COALESCE(lyd.ly_sales_units,0) >0 
        OR COALESCE(mfp.mfp_sales_units,0) >0 ;
            
        CREATE INDEX idx_pdm_product_date_%s ON price_promo_opt_temp.%I using btree(product_id, date);
        CREATE INDEX idx_pdm_date_%s ON price_promo_opt_temp.%I using btree(date);
        ',
        pdm_tbl, pdm_tbl, 
        _target_currency_id, product_columns,
        apd_tbl, pmf_tbl, fdm_tbl, bf_tbl, pf_tbl, mf_tbl, aty_tbl, aly_tbl, mfp_tbl,
        temp_suffix, pdm_tbl, temp_suffix, pdm_tbl
    );
    raise notice 'Product Date Metrics ----- %', _query;
    start_time := clock_timestamp();
    execute _query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken Product Date Metrics: %', end_time - start_time;
    

    
    -- Build dynamic SQL query
    query_text := '
    WITH
    product_hierarchy_metrics AS (
        SELECT
            target_currency_id,
            ' || time_column || ',
            ' || product_columns || ',
            SUM(total_sales_units) as total_sales_units,
            SUM(total_revenue) as total_revenue,
            SUM(total_margin) as total_margin,

            SUM(case when total_flag = 0 then baseline_sales_units else 0 end) as baseline_sales_units,
            SUM(case when total_flag = 0 then baseline_revenue else 0 end) as baseline_revenue,
            SUM(case when total_flag = 0 then baseline_margin else 0 end) as baseline_margin,

            SUM(case when total_flag = 1 then promo_sales_units else 0 end) as promo_sales_units,
            SUM(case when total_flag = 1 then promo_revenue else 0 end) as promo_revenue,
            SUM(case when total_flag = 1 then promo_margin else 0 end) as promo_margin,

            SUM(case when total_flag = 2 then markdown_sales_units else 0 end) as markdown_sales_units,
            SUM(case when total_flag = 2 then markdown_revenue else 0 end) as markdown_revenue,
            SUM(case when total_flag = 2 then markdown_margin else 0 end) as markdown_margin,

            SUM(actual_sales_units) as actual_sales_units,
            SUM(actual_revenue) as actual_revenue,
            SUM(actual_margin) as actual_margin,

            SUM(ly_sales_units) as ly_sales_units,
            SUM(ly_revenue) as ly_revenue,
            SUM(ly_margin) as ly_margin,

            SUM(mfp_sales_units) as mfp_sales_units,
            SUM(mfp_revenue) as mfp_revenue,
            SUM(mfp_margin) as mfp_margin
            
        FROM price_promo_opt_temp.'|| pdm_tbl ||'
        GROUP BY ' || product_select || ' ' || time_column || ',target_currency_id
    ),

    -- Aggregate metrics by week
    weekly_metrics AS (
        SELECT
            ''Weekly'' as time_tag,
            fiscal_week_label as xlabel,
            fiscal_year*100+fiscal_week as fiscal_sort_value,
            SUM(total_sales_units) as total_sales_units,
            SUM(total_revenue) as total_revenue,
            SUM(total_margin) as total_margin,
            CASE WHEN SUM(total_revenue) = 0 THEN 0 
            ELSE SUM(total_margin) / SUM(total_revenue) END AS total_margin_percentage,
            
            SUM(actual_sales_units) as actual_sales_units,
            SUM(actual_revenue) as actual_revenue,
            SUM(actual_margin) as actual_margin,
            CASE WHEN SUM(actual_revenue) = 0 THEN 0
            ELSE SUM(actual_margin) / SUM(actual_revenue) END AS actual_margin_percentage,

            SUM(ly_sales_units) as ly_sales_units,
            SUM(ly_revenue) as ly_revenue,
            SUM(ly_margin) as ly_margin,
            CASE WHEN SUM(ly_revenue) = 0 THEN 0
            ELSE SUM(ly_margin) / SUM(ly_revenue) END AS ly_margin_percentage,

            SUM(mfp_sales_units) as mfp_sales_units,
            SUM(mfp_revenue) as mfp_revenue,
            SUM(mfp_margin) as mfp_margin,
            CASE WHEN SUM(mfp_revenue) = 0 THEN 0
            ELSE SUM(mfp_margin) / SUM(mfp_revenue) END AS mfp_margin_percentage
        FROM price_promo_opt_temp.'|| pdm_tbl ||'
        GROUP BY fiscal_week_label,fiscal_year,fiscal_week
    ),
    
    -- Aggregate metrics by month
    monthly_metrics AS (
        SELECT
            ''Monthly'' as time_tag,
            fiscal_month_label as xlabel,
            fiscal_year*100+fiscal_month as fiscal_sort_value,
            SUM(total_sales_units) as total_sales_units,
            SUM(total_revenue) as total_revenue,
            SUM(total_margin) as total_margin,
            CASE WHEN SUM(total_revenue) = 0 THEN 0 
            ELSE SUM(total_margin) / SUM(total_revenue) END AS total_margin_percentage,
            
            SUM(actual_sales_units) as actual_sales_units,
            SUM(actual_revenue) as actual_revenue,
            SUM(actual_margin) as actual_margin,
            CASE WHEN SUM(actual_revenue) = 0 THEN 0
            ELSE SUM(actual_margin) / SUM(actual_revenue) END AS actual_margin_percentage,

            SUM(ly_sales_units) as ly_sales_units,
            SUM(ly_revenue) as ly_revenue,
            SUM(ly_margin) as ly_margin,
            CASE WHEN SUM(ly_revenue) = 0 THEN 0
            ELSE SUM(ly_margin) / SUM(ly_revenue) END AS ly_margin_percentage,

            SUM(mfp_sales_units) as mfp_sales_units,
            SUM(mfp_revenue) as mfp_revenue,
            SUM(mfp_margin) as mfp_margin,
            CASE WHEN SUM(mfp_revenue) = 0 THEN 0
            ELSE SUM(mfp_margin) / SUM(mfp_revenue) END AS mfp_margin_percentage
        FROM price_promo_opt_temp.'|| pdm_tbl ||'
        GROUP BY fiscal_month_label,fiscal_year,fiscal_month
    ),
    
    -- Aggregate metrics by quarter
    quarterly_metrics AS (
        SELECT
            ''Quarterly'' as time_tag,
            fiscal_quarter_label as xlabel,
            fiscal_year*100+fiscal_quarter as fiscal_sort_value,
            SUM(total_sales_units) as total_sales_units,
            SUM(total_revenue) as total_revenue,
            SUM(total_margin) as total_margin,
            CASE WHEN SUM(total_revenue) = 0 THEN 0
            ELSE SUM(total_margin) / SUM(total_revenue) END AS total_margin_percentage,
            
            SUM(actual_sales_units) as actual_sales_units,
            SUM(actual_revenue) as actual_revenue,
            SUM(actual_margin) as actual_margin,
            CASE WHEN SUM(actual_revenue) = 0 THEN 0
            ELSE SUM(actual_margin) / SUM(actual_revenue) END AS actual_margin_percentage,

            SUM(ly_sales_units) as ly_sales_units,
            SUM(ly_revenue) as ly_revenue,
            SUM(ly_margin) as ly_margin,
            CASE WHEN SUM(ly_revenue) = 0 THEN 0
            ELSE SUM(ly_margin) / SUM(ly_revenue) END AS ly_margin_percentage,

            SUM(mfp_sales_units) as mfp_sales_units,
            SUM(mfp_revenue) as mfp_revenue,
            SUM(mfp_margin) as mfp_margin,
            CASE WHEN SUM(mfp_revenue) = 0 THEN 0
            ELSE SUM(mfp_margin) / SUM(mfp_revenue) END AS mfp_margin_percentage
        FROM price_promo_opt_temp.'|| pdm_tbl ||'
        GROUP BY fiscal_quarter_label,fiscal_year,fiscal_quarter
    ),
    
    -- Aggregate metrics by total
    total_metrics AS (
        SELECT
            ''Total'' as time_tag,
            ''Total'' as xlabel,
            1 as fiscal_sort_value,
            SUM(total_sales_units) as total_sales_units,
            SUM(total_revenue) as total_revenue,
            SUM(total_margin) as total_margin,
            CASE WHEN SUM(total_revenue) = 0 THEN 0
            ELSE SUM(total_margin) / SUM(total_revenue) END AS total_margin_percentage,
            
            SUM(actual_sales_units) as actual_sales_units,
            SUM(actual_revenue) as actual_revenue,
            SUM(actual_margin) as actual_margin,
            CASE WHEN SUM(actual_revenue) = 0 THEN 0
            ELSE SUM(actual_margin) / SUM(actual_revenue) END AS actual_margin_percentage,

            SUM(ly_sales_units) as ly_sales_units,
            SUM(ly_revenue) as ly_revenue,
            SUM(ly_margin) as ly_margin,
            CASE WHEN SUM(ly_revenue) = 0 THEN 0
            ELSE SUM(ly_margin) / SUM(ly_revenue) END AS ly_margin_percentage,

            SUM(mfp_sales_units) as mfp_sales_units,
            SUM(mfp_revenue) as mfp_revenue,
            SUM(mfp_margin) as mfp_margin,
            CASE WHEN SUM(mfp_revenue) = 0 THEN 0
            ELSE SUM(mfp_margin) / SUM(mfp_revenue) END AS mfp_margin_percentage
        FROM price_promo_opt_temp.'|| pdm_tbl ||'
    )';
    
    -- Add final query part based on download flag
    IF _download_flag = 1 THEN
        -- Download mode - return only product_hierarchy_metrics
        query_text := query_text || '
        SELECT json_build_object(
                ''metadata'', json_build_object(
                    ''column_order'', ' || json_ordering_string || '
                ),
                ''records'', json_agg(
                    json_build_object(
                        -- Product hierarchy columns (always first)
                        ' || json_product_columns || '
                        
                        -- Time hierarchy columns (second)
                        ' || time_column_json || ',
                        
                        -- Currency information
                        ''Currency Name'', ''' || _currency_name || ''',
                        ''Currency Symbol'', ''' || _currency_symbol || ''',
                        
                        -- 1. Forecasted metrics (Total)
                        ''Forecasted Units'', ROUND(total_sales_units::numeric, 0),
                        ''Forecasted Revenue'', ROUND(total_revenue::numeric, 0),
                        ''Forecasted Margin'', ROUND(total_margin::numeric, 0),
                        ''Forecasted Margin Percentage'', ROUND((CASE WHEN total_revenue = 0 THEN 0 ELSE 100 * total_margin / total_revenue END)::numeric, 1),
                        
                        -- 2. Actual metrics
                        ''Actual Units'', ROUND(actual_sales_units::numeric, 0),
                        ''Actual Revenue'', ROUND(actual_revenue::numeric, 0),
                        ''Actual Margin'', ROUND(actual_margin::numeric, 0),
                        ''Actual Margin Percentage'', ROUND((CASE WHEN actual_revenue = 0 THEN 0 ELSE 100 * actual_margin / actual_revenue END)::numeric, 1),
                        
                        -- 3. Last Year metrics
                        ''LY Units'', ROUND(ly_sales_units::numeric, 0),
                        ''LY Revenue'', ROUND(ly_revenue::numeric, 0),
                        ''LY Margin'', ROUND(ly_margin::numeric, 0),
                        ''LY Margin Percentage'', ROUND((CASE WHEN ly_revenue = 0 THEN 0 ELSE 100 * ly_margin / ly_revenue END)::numeric, 1),
                        
                        -- 4. Plan metrics (MFP)
                        ''Plan Units'', ROUND(mfp_sales_units::numeric, 0),
                        ''Plan Revenue'', ROUND(mfp_revenue::numeric, 0),
                        ''Plan Margin'', ROUND(mfp_margin::numeric, 0),
                        ''Plan Margin Percentage'', ROUND((CASE WHEN mfp_revenue = 0 THEN 0 ELSE 100 * mfp_margin / mfp_revenue END)::numeric, 1),
                        
                        -- 5. Baseline metrics
                        ''Forecasted Baseline Units'', ROUND(baseline_sales_units::numeric, 0),
                        ''Forecasted Baseline Revenue'', ROUND(baseline_revenue::numeric, 0),
                        ''Forecasted Baseline Margin'', ROUND(baseline_margin::numeric, 0),
                        ''Forecasted Baseline Margin Percentage'', ROUND((CASE WHEN baseline_revenue = 0 THEN 0 ELSE 100 * baseline_margin / baseline_revenue END)::numeric, 1),
                        
                        -- 6. Promo metrics
                        ''Forecasted Promo Units'', ROUND(promo_sales_units::numeric, 0),
                        ''Forecasted Promo Revenue'', ROUND(promo_revenue::numeric, 0),
                        ''Forecasted Promo Margin'', ROUND(promo_margin::numeric, 0),
                        ''Forecasted Promo Margin Percentage'', ROUND((CASE WHEN promo_revenue = 0 THEN 0 ELSE 100 * promo_margin / promo_revenue END)::numeric, 1),
                        
                        -- 7. Markdown metrics
                        ''Forecasted Markdown Units'', ROUND(markdown_sales_units::numeric, 0),
                        ''Forecasted Markdown Revenue'', ROUND(markdown_revenue::numeric, 0),
                        ''Forecasted Markdown Margin'', ROUND(markdown_margin::numeric, 0),
                        ''Forecasted Markdown Margin Percentage'', ROUND((CASE WHEN markdown_revenue = 0 THEN 0 ELSE 100 * markdown_margin / markdown_revenue END)::numeric, 1)
                    )::json
                )
            ) as result
        FROM product_hierarchy_metrics';
    ELSE
        -- API mode - return union of all time metrics with time_tag as a top-level key and currency info outside
        query_text := query_text || '
        ,combined_metrics AS (
            SELECT time_tag, 
                   json_agg(
                       json_build_object(
                           -- Time label (always first in API mode)
                           ''time_label'', xlabel,
                           
                           -- Currency information
                           ''currency_id'', ' || _target_currency_id || ',
                           ''currency_name'', ''' || _currency_name || ''',
                           ''currency_symbol'', ''' || _currency_symbol || ''',
                           
                           -- 1. Forecasted metrics (Total)
                           ''forecasted_sales_units'', ROUND(total_sales_units::numeric, 0),
                           ''forecasted_revenue'', ROUND(total_revenue::numeric, 0),
                           ''forecasted_margin'', ROUND(total_margin::numeric, 0),
                           ''forecasted_margin_percent'', ROUND((total_margin_percentage * 100)::numeric, 1),
                           
                           -- 2. Actual metrics
                           ''actualized_sales_units'', ROUND(actual_sales_units::numeric, 0),
                           ''actualized_revenue'', ROUND(actual_revenue::numeric, 0),
                           ''actualized_margin'', ROUND(actual_margin::numeric, 0),
                           ''actualized_margin_percent'', ROUND((actual_margin_percentage * 100)::numeric, 1),
                           
                           -- 3. Last Year metrics
                           ''ly_sales_units'', ROUND(ly_sales_units::numeric, 0),
                           ''ly_revenue'', ROUND(ly_revenue::numeric, 0),
                           ''ly_margin'', ROUND(ly_margin::numeric, 0),
                           ''ly_margin_percent'', ROUND((ly_margin_percentage * 100)::numeric, 1),
                           
                           -- 4. Plan metrics (MFP)
                           ''plan_sales_units'', ROUND(mfp_sales_units::numeric, 0),
                           ''plan_revenue'', ROUND(mfp_revenue::numeric, 0),
                           ''plan_margin'', ROUND(mfp_margin::numeric, 0),
                           ''plan_margin_percent'', ROUND((mfp_margin_percentage * 100)::numeric, 1)
                       )::json
                    ) AS data
            FROM (
                SELECT time_tag, xlabel, fiscal_sort_value,
                       total_sales_units, total_revenue, total_margin, total_margin_percentage,
                       actual_sales_units, actual_revenue, actual_margin, actual_margin_percentage,
                       ly_sales_units, ly_revenue, ly_margin, ly_margin_percentage,
                       mfp_sales_units, mfp_revenue, mfp_margin, mfp_margin_percentage
                FROM (
                    SELECT * FROM weekly_metrics
                    UNION ALL
                    SELECT * FROM monthly_metrics
                    UNION ALL
                    SELECT * FROM quarterly_metrics
                    UNION ALL
                    SELECT * FROM total_metrics
                ) AS all_metrics
                Order by time_tag,fiscal_sort_value asc
            ) AS grouped
            GROUP BY time_tag
        )
        
        SELECT json_object_agg(time_tag, data)::json AS result
        FROM combined_metrics;';
    END IF;

    
    -- Print the query text for debugging
    RAISE NOTICE 'Final query text: %', query_text;

    
    -- Execute the query
    EXECUTE query_text INTO result;
    
    --Drop unlogged tables
    EXECUTE 'DROP TABLE IF EXISTS price_promo_opt_temp.' || pmf_tbl;
    EXECUTE 'DROP TABLE IF EXISTS price_promo_opt_temp.' || fdm_tbl;
    EXECUTE 'DROP TABLE IF EXISTS price_promo_opt_temp.' || cr_tbl;
	EXECUTE 'DROP TABLE IF EXISTS price_promo_opt_temp.' || fdc_tbl;
    EXECUTE 'DROP TABLE IF EXISTS price_promo_opt_temp.' || bf_tbl;
    EXECUTE 'DROP TABLE IF EXISTS price_promo_opt_temp.' || pf_tbl;
    EXECUTE 'DROP TABLE IF EXISTS price_promo_opt_temp.' || mf_tbl;
    EXECUTE 'DROP TABLE IF EXISTS price_promo_opt_temp.' || aty_tbl;
    EXECUTE 'DROP TABLE IF EXISTS price_promo_opt_temp.' || aly_tbl;
    EXECUTE 'DROP TABLE IF EXISTS price_promo_opt_temp.' || mfp_tbl;
    EXECUTE 'DROP TABLE IF EXISTS price_promo_opt_temp.' || pdm_tbl;

    RETURN result;
END;
$function$
;
