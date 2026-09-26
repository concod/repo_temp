--liquibase formatted sql
--changeset nikhil.shet@impactanalytics.co:fn_dd_total_business_report runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Function to get Total Business Report data with dynamic time aggregation

DROP FUNCTION IF EXISTS price_promo.fn_dd_total_business_report;

CREATE OR REPLACE FUNCTION price_promo.fn_dd_total_business_report(_time_level integer, _start_date date, _end_date date, product_hierarchy_levels integer[], store_hierarchy_levels integer[], _product_filters jsonb DEFAULT NULL::jsonb, _store_filters jsonb DEFAULT NULL::jsonb, _download_flag integer DEFAULT 0, _target_currency_id integer DEFAULT 1)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
-- Purpose – Generates a comprehensive Total Business Report with dynamic time aggregation and detailed JSON output
-- 
-- SELECT price_promo.fn_dd_total_business_report(
--         _time_level := 0::integer,
--         _start_date := '2025-12-08'::date,
--         _end_date := '2026-02-02'::date,
--         product_hierarchy_levels := array[0,1]::integer[],
--         store_hierarchy_levels := array[0]::integer[],
--         _product_filters := '{"l0_ids": [1], "l1_ids": [1, 2]}'::jsonb,
--         _store_filters := '{"s0_ids": [11]}'::jsonb,
--         _download_flag := 0::integer,
--         _target_currency_id := 1::integer
--     ) AS json_data
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
    _store_hierarchy_config jsonb;
    _key text;
    _value INTEGER[];
    _column_name text;
    product_where_clause text;
    store_where_clause text;
    product_columns text;
    json_product_columns text;
    store_columns text;
    json_store_columns text;
    time_column text;
    time_column_json text;
    _currency_name text;
    _currency_symbol text;
    product_select text;
	product_select_imputed text;
    store_select text;
    store_select_imputed text;
    -- Variables for maintaining JSON key ordering
    product_key_array text[];
    store_key_array text[];
    time_key_array text[];
    json_ordering_array text[];
    json_ordering_string text;
    -- Temporary suffix for naming unlogged temp tables
    temp_suffix text;
    -- Names for UNLOGGED temp tables
    pmf_tbl text;  -- product_master_filtered
	smf_tbl text;  -- store master filtered
    fdm_tbl text;  -- fiscal_date_mapping
    cr_tbl  text;  -- currency_rates
	fdc_tbl text;  -- Fiscal date Currency table
	tbr_tbl text; -- TBR pre agg table
    mf_tbl  text;  -- markdown_forecast
 	apd_tbl text;  -- all product date table
	fmt_tbl text;  -- fact metrics table
	fmt2_tbl text; -- fact metrics table 2
    pdm_tbl text;  -- product date metrics table
	pdm_tbl_agg text; -- product date metrics aggregated table
	fnl_agg_tbl text; -- final aggregated table
    _query text;
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
    product_where_clause := '';
    
    -- Update the where condition with product filters
    IF _product_filters IS NOT NULL THEN
        FOR _key IN SELECT * FROM jsonb_object_keys(_product_filters) LOOP
            _value := (SELECT array_agg(val::INTEGER)
                      FROM jsonb_array_elements(_product_filters -> _key) val);
    
            IF array_length(_value, 1) > 0 THEN
                _column_name := _product_hierarchy_config -> _key ->> 'id_column';
    
                IF _column_name IS NOT NULL THEN
                    product_where_clause := product_where_clause ||
                        ' AND pm.' || quote_ident(_column_name) ||
                        ' IN (' || array_to_string(_value, ', ') || ')';
                ELSE
                     RAISE WARNING '[PRODUCT FILTER] Key "%" not found in product_hierarchy_levels or lacks an "id_column".', _key;
                END IF;
            END IF;
        END LOOP;
    END IF;

    -- Log the where condition for debugging
    RAISE NOTICE 'Product filter where condition: %', product_where_clause;


    -- Get store hierarchy configuration
    SELECT config_value::jsonb INTO _store_hierarchy_config
    FROM price_promo.tb_tool_configurations
    WHERE module = 'store' AND config_name = 'hierarchy_filters';
    
    -- Initialize where condition string
    store_where_clause := '';
    
    -- Update the where condition with store filters
    IF _store_filters IS NOT NULL THEN
        FOR _key IN SELECT * FROM jsonb_object_keys(_store_filters) LOOP
            _value := (SELECT array_agg(val::INTEGER)
                      FROM jsonb_array_elements(_store_filters -> _key) val);
    
            IF array_length(_value, 1) > 0 THEN
                _column_name := _store_hierarchy_config -> _key ->> 'id_column';
    
                IF _column_name IS NOT NULL THEN
                    store_where_clause := store_where_clause ||
                        ' AND sm.' || quote_ident(_column_name) ||
                        ' IN (' || array_to_string(_value, ', ') || ')';
                ELSE
                     RAISE WARNING '[STORE FILTER] Key "%" not found in store_hierarchy_levels or lacks an "id_column".', _key;
                END IF;
            END IF;
        END LOOP;
    END IF;

    -- Log the where condition for debugging
    RAISE NOTICE 'Store filter where condition: %', store_where_clause;
    

    product_columns := price_promo_opt.fn_reporting_r1_get_hierarchy_names(product_hierarchy_levels, 'product'::text, ARRAY[]::text[]);
    product_select_imputed := price_promo_opt.fn_reporting_r1_get_hierarchy_names(product_hierarchy_levels, 'product'::text, ARRAY[]::text[], false, true);
    json_product_columns := price_promo_opt.fn_reporting_r1_get_hierarchy_names_for_json(product_hierarchy_levels, 'product'::text, ARRAY[]::text[]);
    product_select := CASE WHEN product_columns IS NOT NULL AND product_columns <> '' THEN product_columns || ', ' ELSE '' end;

    store_columns := price_promo_opt.fn_reporting_r1_get_hierarchy_names(store_hierarchy_levels, 'store'::text, ARRAY[]::text[]);
    store_select_imputed := price_promo_opt.fn_reporting_r1_get_hierarchy_names(store_hierarchy_levels, 'store'::text, ARRAY[]::text[], false, true);
    json_store_columns := price_promo_opt.fn_reporting_r1_get_hierarchy_names_for_json(store_hierarchy_levels, 'store'::text, ARRAY[]::text[]);
    store_select := CASE WHEN store_columns IS NOT NULL AND store_columns <> '' THEN store_columns || ', ' ELSE '' end; 


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
    RAISE notice 'store_columns %', store_columns;
    RAISE notice 'store_select %', store_select;
    RAISE notice 'store_select_imputed %', store_select_imputed;
    RAISE notice 'json_store_columns %', json_store_columns;
    RAISE notice 'time_column %', time_column;

    -- Build json_ordering array to preserve key insertion order for download workflows
    -- 1. Extract keys from dynamic product hierarchy columns
    SELECT COALESCE(array_agg(match[1]), ARRAY[]::text[]) INTO product_key_array
    FROM regexp_matches(json_product_columns, '''([^'']+)''', 'g') AS match;

    -- 2. Extract keys from dynamic time hierarchy columns
    SELECT COALESCE(array_agg(match[1]), ARRAY[]::text[]) INTO time_key_array
    FROM regexp_matches(time_column_json, '''([^'']+)''', 'g') AS match;

    -- 3. Combine all keys in the same order as they will be inserted in json_build_object
    SELECT COALESCE(array_agg(match[1]), ARRAY[]::text[]) INTO store_key_array
    FROM regexp_matches(json_store_columns, '''([^'']+)''', 'g') AS match;

    json_ordering_array := product_key_array || store_key_array || time_key_array || ARRAY[
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
    smf_tbl := 'store_master_filtered_' || temp_suffix;
    fdm_tbl := 'fiscal_date_mapping_' || temp_suffix;
    cr_tbl  := 'currency_rates_' || temp_suffix;
	fdc_tbl  := 'fiscal_date_currency_' || temp_suffix;
	tbr_tbl := 'tbr_psd_' || temp_suffix;
    mf_tbl  := 'markdown_forecast_' || temp_suffix;
	apd_tbl := 'all_product_date_' || temp_suffix;
	fmt_tbl := 'fact_metrics_' || temp_suffix;
	fmt2_tbl := 'fact_metrics_2_' || temp_suffix;
    pdm_tbl := 'product_date_metrics_' || temp_suffix;
	pdm_tbl_agg := 'product_date_metrics_agg_' || temp_suffix;
	fnl_agg_tbl := 'final_agg_table_' || temp_suffix;

    -- 0) Store master filtered
   _query := format('
        DROP TABLE IF EXISTS price_promo_opt_temp.%I; 
        CREATE UNLOGGED TABLE price_promo_opt_temp.%I AS 
        SELECT distinct store_reco_level, %s FROM pricesmart.tb_store_master sm
        WHERE 1=1 %s;
        
        CREATE INDEX idx_smf_store_reco_level_%s 
        ON price_promo_opt_temp.%I using btree(store_reco_level);

		ANALYZE price_promo_opt_temp.%I;
        ',
        smf_tbl,
        smf_tbl,
        store_select_imputed,
        store_where_clause,
        temp_suffix,
        smf_tbl,
		smf_tbl
    );
    raise notice 'Store Master Filtered  ----- %', _query;
    start_time := clock_timestamp();
    execute _query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken Store Master Filtered : %', end_time - start_time;


    -- 1) product_master_filtered
    _query := format('
        DROP TABLE IF EXISTS price_promo_opt_temp.%I; 
        CREATE UNLOGGED TABLE price_promo_opt_temp.%I AS 
        SELECT product_id, currency_id,
		%s
		FROM price_promo.product_master pm 
        WHERE 1=1 %s;
        
        CREATE INDEX idx_pmf_product_id_%s 
        ON price_promo_opt_temp.%I using btree(product_id);

		ANALYZE price_promo_opt_temp.%I;
        ',
        pmf_tbl,
        pmf_tbl,
		product_select_imputed,
        product_where_clause,
        temp_suffix,
        pmf_tbl,
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

		ANALYZE price_promo_opt_temp.%I;
        ',
        fdm_tbl,
        fdm_tbl,
        _start_date,
        _end_date,
        temp_suffix,
        fdm_tbl,
        temp_suffix,
        fdm_tbl,
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

		ANALYZE price_promo_opt_temp.%I;
        ',
        cr_tbl, cr_tbl, _start_date, _end_date, _target_currency_id, _target_currency_id,
        temp_suffix, cr_tbl, cr_tbl
    );
    raise notice 'Currency Rates ----- %', _query;
    start_time := clock_timestamp();
    execute _query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken Currency Rates: %', end_time - start_time;


	 -- 3.5) Fiscal date currency_rates
    _query := format('
        DROP TABLE IF EXISTS price_promo_opt_temp.%I; 
        CREATE UNLOGGED TABLE price_promo_opt_temp.%I AS 
        SELECT 
		fdm.*, cr.currency_id, cr.planned_rate, cr.actual_rate
        from price_promo_opt_temp.%I fdm
        inner join price_promo_opt_temp.%I cr
        on fdm.date = cr.date ;
            
        CREATE INDEX idx_fdc_%s ON price_promo_opt_temp.%I (currency_id, ly_date);

		ANALYZE price_promo_opt_temp.%I;
        ',
        fdc_tbl, fdc_tbl, fdm_tbl, cr_tbl, temp_suffix, fdc_tbl, fdc_tbl
    );
    raise notice 'Currency Rates ----- %', _query;
    start_time := clock_timestamp();
    execute _query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken Currency Rates: %', end_time - start_time;


	-- 4) tbr_pre_agg
    _query := format('
        DROP TABLE IF EXISTS price_promo_opt_temp.%I; 
        CREATE UNLOGGED TABLE price_promo_opt_temp.%I AS 
        SELECT 
            tbr.product_id, 
           	tbr.store_reco_level,
           	tbr.date, 

			baseline_sales_units,
			baseline_revenue,
			baseline_margin,

			promo_sales_units,
			promo_revenue,
			promo_margin,

			actual_sales_units,
			actual_revenue,
			actual_margin,

			ly_sales_units,
			ly_revenue,
			ly_margin,

            mfp_sales_units, 
            mfp_revenue, 
            mfp_margin
        FROM 
            price_promo_opt.tbr_product_store_date tbr
        INNER JOIN 
            price_promo_opt_temp.%I pmf ON tbr.product_id = pmf.product_id AND tbr.currency_id = pmf.currency_id
        WHERE 
            tbr.date BETWEEN %L AND %L AND tbr.currency_id = %L;
            
        CREATE INDEX idx_tbr_prod_store_date_%s ON price_promo_opt_temp.%I using btree(product_id, store_reco_level, "date");

		ANALYZE price_promo_opt_temp.%I;
        ',
        tbr_tbl, tbr_tbl, pmf_tbl, _start_date, _end_date, _target_currency_id, temp_suffix, tbr_tbl, tbr_tbl
    );
    raise notice 'TBR Data ----- %', _query;
    start_time := clock_timestamp();
    execute _query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken TBR Data: %', end_time - start_time;


	-- 5) markdown_forecast
    _query := format('
        DROP TABLE IF EXISTS price_promo_opt_temp.%I; 
        CREATE UNLOGGED TABLE price_promo_opt_temp.%I AS 

		with filtered_markdown_table_fin as materialized 
		(
		SELECT product_id, store_id, recommendation_date, sales_units, revenue, margin
        FROM 
			price_markdown.tb_ssd_fin fin
        INNER JOIN 
            price_markdown.tb_approval_metrics am 
            ON fin.product_level_id = am.product_level_id 
            and fin.store_level_id = am.store_level_id
            AND fin.pcd_id = am.pcd_id 
            AND fin.strategy_id = am.strategy_id
        
        WHERE fin.recommendation_date BETWEEN %L AND %L 
		%s
		)
        SELECT 
            fin.product_id, 
            sm.store_reco_level,
            fin.recommendation_date AS date, 
            max(coalesce(fin.sales_units, 0)) AS markdown_sales_units, 
            max(coalesce(fin.revenue * planned_rate, 0)) AS markdown_revenue, 
            max(coalesce(fin.margin * planned_rate, 0)) AS markdown_margin
        FROM 
			filtered_markdown_table_fin fin
        INNER JOIN
            pricesmart.tb_store_master sm ON fin.store_id = sm.store_id    
        INNER JOIN 
            price_promo_opt_temp.%I pmf ON fin.product_id = pmf.product_id 
        INNER JOIN 
            price_promo_opt_temp.%I cr ON fin.recommendation_date = cr.date AND pmf.currency_id = cr.currency_id 
        GROUP BY 
            1, 2, 3;
            
        CREATE INDEX idx_mf_product_date_%s ON price_promo_opt_temp.%I using btree(product_id, store_reco_level, "date");

		ANALYZE price_promo_opt_temp.%I;
        ',
        mf_tbl,mf_tbl,
		_start_date, _end_date,
        CASE WHEN _strategy_ids IS NOT NULL AND array_length(_strategy_ids,1) > 0 
            THEN format('AND fin.strategy_id = ANY(ARRAY[%s]) ', array_to_string(_strategy_ids, ','))
            ELSE ''
        END,
		pmf_tbl, cr_tbl, temp_suffix, mf_tbl, mf_tbl
    );
    raise notice 'Markdown Forecast ----- %', _query;
    start_time := clock_timestamp();
    execute _query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken Markdown Forecast: %', end_time - start_time;


	-- 6) Necessary Product date combination
	_query := format('
		DROP TABLE IF EXISTS price_promo_opt_temp.%I;
		CREATE UNLOGGED TABLE price_promo_opt_temp.%I AS
		SELECT product_id, store_reco_level, date
		FROM (
			SELECT product_id, store_reco_level, date FROM price_promo_opt_temp.%I
			UNION
			SELECT product_id, store_reco_level, date FROM price_promo_opt_temp.%I
		) t;
	
	   	CREATE INDEX idx_apd_product_date_%s ON price_promo_opt_temp.%I using btree(product_id, store_reco_level, "date");
	
		ANALYZE price_promo_opt_temp.%I;
	   	',
	  	apd_tbl, apd_tbl, tbr_tbl, mf_tbl, temp_suffix, apd_tbl, apd_tbl
	);
	raise notice 'Common Product Date ----- %', _query;
	start_time := clock_timestamp();
	execute _query;
	end_time := clock_timestamp();
	RAISE NOTICE 'Time taken Product Date: %', end_time - start_time;	


---------------------------------------------------------------------------------------------------------------------------------
	IF _download_flag = 1 THEN
	    
	 	
		-- 7) Fact Metrics
		_query := format('
	        DROP TABLE IF EXISTS price_promo_opt_temp.%I;
	
			CREATE UNLOGGED TABLE price_promo_opt_temp.%I AS
			SELECT 
				apd.product_id, apd.store_reco_level, apd.date,
	
				COALESCE(tbr.baseline_sales_units,0) baseline_sales_units,
			    COALESCE(tbr.baseline_revenue,0) baseline_revenue,
			    COALESCE(tbr.baseline_margin,0) baseline_margin,
			
			    COALESCE(tbr.promo_sales_units,0) promo_sales_units,
			    COALESCE(tbr.promo_revenue,0) promo_revenue,
			    COALESCE(tbr.promo_margin,0) promo_margin,
			
			    COALESCE(mf.markdown_sales_units,0) markdown_sales_units,
			    COALESCE(mf.markdown_revenue,0) markdown_revenue,
			    COALESCE(mf.markdown_margin,0) markdown_margin,
			
			    COALESCE(tbr.actual_sales_units,0) actual_sales_units,
			    COALESCE(tbr.actual_revenue,0) actual_revenue,
			    COALESCE(tbr.actual_margin,0) actual_margin,
			
			    COALESCE(tbr.ly_sales_units,0) ly_sales_units,
			    COALESCE(tbr.ly_revenue,0) ly_revenue,
			    COALESCE(tbr.ly_margin,0) ly_margin,
			
			    COALESCE(tbr.mfp_sales_units,0) mfp_sales_units,
			    COALESCE(tbr.mfp_revenue,0) mfp_revenue,
			    COALESCE(tbr.mfp_margin,0) mfp_margin
	
			FROM price_promo_opt_temp.%I apd
			LEFT JOIN price_promo_opt_temp.%I tbr USING (product_id,store_reco_level,date)
			LEFT JOIN price_promo_opt_temp.%I mf USING (product_id,store_reco_level,date)
			
			WHERE
			    COALESCE(tbr.baseline_sales_units,0) >0
			 OR COALESCE(tbr.promo_sales_units,0) >0
			 OR COALESCE(mf.markdown_sales_units,0) >0
			 OR COALESCE(tbr.actual_sales_units,0) >0
			 OR COALESCE(tbr.ly_sales_units,0) >0
			 OR COALESCE(tbr.mfp_sales_units,0) >0;
	            
	        CREATE INDEX idx_fact_metrics_%s ON price_promo_opt_temp.%I using btree(product_id, store_reco_level, "date");
	
			ANALYZE price_promo_opt_temp.%I;
	        ',
	        fmt_tbl, fmt_tbl, apd_tbl, tbr_tbl, mf_tbl, temp_suffix, fmt_tbl, fmt_tbl
	    );
	    raise notice 'Fact Metrics ----- %', _query;
	    start_time := clock_timestamp();
	    execute _query;
	    end_time := clock_timestamp();
	    RAISE NOTICE 'Time taken Fact Metrics: %', end_time - start_time;

		-- 8) Final Product date metrics table
		_query := format('
	        DROP TABLE IF EXISTS price_promo_opt_temp.%I; 
	        CREATE UNLOGGED TABLE price_promo_opt_temp.%I AS 
	        SELECT
	            f.product_id,
	            %L as target_currency_id,
	            %s
	            %s
	            fm.date,
	            fm.fiscal_week,
	            fm.fiscal_month,
	            fm.fiscal_quarter,
	            fm.fiscal_year,
	            fm.week_start_date,
	            fm.fiscal_week_label,
	            fm.fiscal_month_label,
	            fm.fiscal_quarter_label,
	            f.baseline_sales_units,
			    f.baseline_revenue,
			    f.baseline_margin,
	
			    f.promo_sales_units,
			    f.promo_revenue,
			    f.promo_margin,
	
	            f.markdown_sales_units,
			    f.markdown_revenue,
			    f.markdown_margin,
	
	            f.actual_sales_units,
			    f.actual_revenue,
			    f.actual_margin,
	
	            f.ly_sales_units,
			    f.ly_revenue,
			    f.ly_margin,
	
	            f.mfp_sales_units,
			    f.mfp_revenue,
			    f.mfp_margin,
	
				GREATEST(
				    f.baseline_sales_units,
				    f.promo_sales_units,
				    f.markdown_sales_units
				) AS total_sales_units,
				
				CASE
				    WHEN GREATEST(f.baseline_sales_units, f.promo_sales_units, f.markdown_sales_units) = f.baseline_sales_units
				        THEN f.baseline_revenue
				    WHEN GREATEST(f.baseline_sales_units, f.promo_sales_units, f.markdown_sales_units) = f.promo_sales_units
				        THEN f.promo_revenue
				    ELSE f.markdown_revenue
				END AS total_revenue,
				
				CASE
				    WHEN GREATEST(f.baseline_sales_units, f.promo_sales_units, f.markdown_sales_units) = f.baseline_sales_units
				        THEN f.baseline_margin
				    WHEN GREATEST(f.baseline_sales_units, f.promo_sales_units, f.markdown_sales_units) = f.promo_sales_units
				        THEN f.promo_margin
				    ELSE f.markdown_margin
				END AS total_margin,
				
				CASE
				    WHEN GREATEST(f.baseline_sales_units, f.promo_sales_units, f.markdown_sales_units) = f.baseline_sales_units
				        THEN 0
				    WHEN GREATEST(f.baseline_sales_units, f.promo_sales_units, f.markdown_sales_units) = f.promo_sales_units
				        THEN 1
				    ELSE 2
				END AS total_flag
	
	        FROM 
			    price_promo_opt_temp.%I f
	        INNER JOIN  
				price_promo_opt_temp.%I pmf USING(product_id)
	        INNER JOIN 
				price_promo_opt_temp.%I smf USING(store_reco_level)
	        INNER JOIN 
				price_promo_opt_temp.%I fm USING(date);
	            
	        CREATE INDEX idx_pdm_product_date_%s ON price_promo_opt_temp.%I using btree(product_id, date);
	        CREATE INDEX idx_pdm_date_%s ON price_promo_opt_temp.%I using btree(date);
	
			ANALYZE price_promo_opt_temp.%I;
	        ',
	        pdm_tbl, pdm_tbl, 
	        _target_currency_id, product_select, store_select,
	        fmt_tbl, pmf_tbl, smf_tbl, fdm_tbl,
	        temp_suffix, pdm_tbl, temp_suffix, pdm_tbl, pdm_tbl
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
	            ' || store_columns || ',
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
	        GROUP BY ' || product_select || ' ' || store_select || ' ' || time_column || ',target_currency_id
	    )

        SELECT json_build_object(
                ''metadata'', json_build_object(
                    ''column_order'', ' || json_ordering_string || '
                ),
                ''records'', json_agg(
                    json_build_object(
                        -- Product hierarchy columns (always first)
                        ' || json_product_columns || '

                        -- Store hierarchy columns (always second)
                        ' || json_store_columns || '
                        
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
        FROM product_hierarchy_metrics;';

		RAISE NOTICE 'Final query text: %', query_text;

		-- Execute the query
    	EXECUTE query_text INTO result;
---------------------------------------------------------------------------------------------------------------------------------
	ELSE
---------------------------------------------------------------------------------------------------------------------------------
		
		-- 7) Fact Metrics
		_query := format('
	        DROP TABLE IF EXISTS price_promo_opt_temp.%I;
	
			CREATE UNLOGGED TABLE price_promo_opt_temp.%I AS
			SELECT 
				apd.product_id, apd.store_reco_level, apd.date,
	
				baseline_sales_units,
			    baseline_revenue,
			    baseline_margin,
			
			    promo_sales_units,
			    promo_revenue,
			    promo_margin,
			
			    markdown_sales_units,
			    markdown_revenue,
			    markdown_margin
	
			FROM price_promo_opt_temp.%I apd
			LEFT JOIN price_promo_opt_temp.%I tbr USING (product_id,store_reco_level,date)
			LEFT JOIN price_promo_opt_temp.%I mf USING (product_id,store_reco_level,date)
			
			WHERE
			    baseline_sales_units >0
			 OR promo_sales_units >0
			 OR markdown_sales_units >0;
	            
	        CREATE INDEX idx_fact_metrics_%s ON price_promo_opt_temp.%I using btree(product_id, store_reco_level, "date");
	
			ANALYZE price_promo_opt_temp.%I;
	        ',
	        fmt_tbl, fmt_tbl, apd_tbl, tbr_tbl, mf_tbl, temp_suffix, fmt_tbl, fmt_tbl
	    );
	    raise notice 'Fact Metrics ----- %', _query;
	    start_time := clock_timestamp();
	    execute _query;
	    end_time := clock_timestamp();
	    RAISE NOTICE 'Time taken Fact Metrics: %', end_time - start_time;

		-- 8) Fact Metrics 2
		_query := format('
	        DROP TABLE IF EXISTS price_promo_opt_temp.%I;
	
			CREATE UNLOGGED TABLE price_promo_opt_temp.%I AS
			SELECT
			    date,
			
			    SUM(actual_sales_units) AS actual_sales_units,
			    SUM(actual_revenue) AS actual_revenue,
			    SUM(actual_margin) AS actual_margin,
			
			    SUM(ly_sales_units) AS ly_sales_units,
			    SUM(ly_revenue) AS ly_revenue,
			    SUM(ly_margin) AS ly_margin,
			
			    SUM(mfp_sales_units) AS mfp_sales_units,
			    SUM(mfp_revenue) AS mfp_revenue,
			    SUM(mfp_margin) AS mfp_margin
			
			FROM (
			    
			    SELECT
			        date,
			        actual_sales_units,
			        actual_revenue,
			        actual_margin,
			        0 AS ly_sales_units,
			        0 AS ly_revenue,
			        0 AS ly_margin,
			        0 AS mfp_sales_units,
			        0 AS mfp_revenue,
			        0 AS mfp_margin
			    FROM price_promo_opt_temp.%I
			    WHERE actual_sales_units > 0
			
			    UNION ALL
			
			    SELECT
			        date,
			        0,0,0,
			        ly_sales_units,
			        ly_revenue,
			        ly_margin,
			        0,0,0
			    FROM price_promo_opt_temp.%I
			    WHERE ly_sales_units > 0
			
			    UNION ALL
			
			    SELECT
			        date,
			        0,0,0,
			        0,0,0,
			        mfp_sales_units,
			        mfp_revenue,
			        mfp_margin
			    FROM price_promo_opt_temp.%I
			    WHERE mfp_sales_units > 0
			
			) x
			GROUP BY date;
	            
	        CREATE INDEX idx_fact_metrics_2_%s ON price_promo_opt_temp.%I using btree("date");
	
			ANALYZE price_promo_opt_temp.%I;
	        ',
	        fmt2_tbl, fmt2_tbl, tbr_tbl, tbr_tbl, tbr_tbl, temp_suffix, fmt2_tbl, fmt2_tbl
	    );
	    raise notice 'Fact Metrics 2 ----- %', _query;
	    start_time := clock_timestamp();
	    execute _query;
	    end_time := clock_timestamp();
	    RAISE NOTICE 'Time taken Fact Metrics 2: %', end_time - start_time;

		-- 9) Product date metrics table
	    _query := format('
	        DROP TABLE IF EXISTS price_promo_opt_temp.%I; 
	        CREATE UNLOGGED TABLE price_promo_opt_temp.%I AS 
	        SELECT
	            f.product_id,
	            f.date,	

				GREATEST(
				    f.baseline_sales_units,
				    f.promo_sales_units,
				    f.markdown_sales_units
				) AS total_sales_units,
				
				CASE
				    WHEN GREATEST(f.baseline_sales_units, f.promo_sales_units, f.markdown_sales_units) = f.baseline_sales_units
				        THEN f.baseline_revenue
				    WHEN GREATEST(f.baseline_sales_units, f.promo_sales_units, f.markdown_sales_units) = f.promo_sales_units
				        THEN f.promo_revenue
				    ELSE f.markdown_revenue
				END AS total_revenue,
				
				CASE
				    WHEN GREATEST(f.baseline_sales_units, f.promo_sales_units, f.markdown_sales_units) = f.baseline_sales_units
				        THEN f.baseline_margin
				    WHEN GREATEST(f.baseline_sales_units, f.promo_sales_units, f.markdown_sales_units) = f.promo_sales_units
				        THEN f.promo_margin
				    ELSE f.markdown_margin
				END AS total_margin
	
	        FROM 
			    price_promo_opt_temp.%I f
	        INNER JOIN  
				price_promo_opt_temp.%I pmf USING(product_id)
	        INNER JOIN 
				price_promo_opt_temp.%I smf USING(store_reco_level);
	            
	        CREATE INDEX idx_pdm_product_date_%s ON price_promo_opt_temp.%I using btree(product_id, date);
	        CREATE INDEX idx_pdm_date_%s ON price_promo_opt_temp.%I using btree(date);
	
			ANALYZE price_promo_opt_temp.%I;
	        ',
	        pdm_tbl, pdm_tbl, 
	        fmt_tbl, pmf_tbl, smf_tbl,
	        temp_suffix, pdm_tbl, temp_suffix, pdm_tbl, pdm_tbl
	    );
	    raise notice 'Product Date Metrics ----- %', _query;
	    start_time := clock_timestamp();
	    execute _query;
	    end_time := clock_timestamp();
	    RAISE NOTICE 'Time taken Product Date Metrics: %', end_time - start_time;


		-- 10) Product date metrics aggregated table
	    _query := format('
	        DROP TABLE IF EXISTS price_promo_opt_temp.%I; 
	        CREATE UNLOGGED TABLE price_promo_opt_temp.%I AS 
	        SELECT
	            pdm.date,
				
				SUM(total_sales_units) AS total_sales_units,
				SUM(total_revenue) AS total_revenue,
				SUM(total_margin) AS total_margin
	
	        FROM 
			    price_promo_opt_temp.%I pdm
	        GROUP BY 1;
	
	        CREATE INDEX idx_pdm_agg_date_%s ON price_promo_opt_temp.%I using btree(date);
	
			ANALYZE price_promo_opt_temp.%I;
	        ',
	        pdm_tbl_agg, pdm_tbl_agg, pdm_tbl,
	        temp_suffix, pdm_tbl_agg, pdm_tbl_agg
	    );
	    raise notice 'Product Date Metrics Aggregated ----- %', _query;
	    start_time := clock_timestamp();
	    execute _query;
	    end_time := clock_timestamp();
	    RAISE NOTICE 'Time taken Product Date Metrics Aggregated: %', end_time - start_time;    


		-- 11) Final aggregated table
	    _query := format('
	        DROP TABLE IF EXISTS price_promo_opt_temp.%I; 
	        CREATE UNLOGGED TABLE price_promo_opt_temp.%I AS 
			WITH base AS ( 
		        SELECT
		            COALESCE(pdma.date, fmt2.date) AS date, 
						
					COALESCE(pdma.total_sales_units,0) AS total_sales_units, 
					COALESCE(pdma.total_revenue,0) AS total_revenue, 
					COALESCE(pdma.total_margin,0) AS total_margin, 
					
					COALESCE(fmt2.actual_sales_units,0) AS actual_sales_units, 
					COALESCE(fmt2.actual_revenue,0) AS actual_revenue, 
					COALESCE(fmt2.actual_margin,0) AS actual_margin, 
					
					COALESCE(fmt2.ly_sales_units,0) AS ly_sales_units, 
					COALESCE(fmt2.ly_revenue,0) AS ly_revenue, 
					COALESCE(fmt2.ly_margin,0) AS ly_margin, 
					
					COALESCE(fmt2.mfp_sales_units,0) AS mfp_sales_units, 
					COALESCE(fmt2.mfp_revenue,0) AS mfp_revenue, 
					COALESCE(fmt2.mfp_margin,0) AS mfp_margin 
		
		        FROM 
				    price_promo_opt_temp.%I pdma
		        
				FULL OUTER JOIN (SELECT date, SUM(actual_sales_units) AS actual_sales_units, 
								SUM(actual_revenue) AS actual_revenue, SUM(actual_margin) AS actual_margin,
								SUM(ly_sales_units) AS ly_sales_units, 
								SUM(ly_revenue) AS ly_revenue, SUM(ly_margin) AS ly_margin,
								SUM(mfp_sales_units) AS mfp_sales_units, 
								SUM(mfp_revenue) AS mfp_revenue, SUM(mfp_margin) AS mfp_margin 
								FROM price_promo_opt_temp.%I GROUP BY 1 
				) fmt2
				ON pdma.date = fmt2.date
			)

			SELECT b.*,
			fm.fiscal_week, fm.fiscal_month, fm.fiscal_quarter, fm.fiscal_year, fm.week_start_date, fm.fiscal_week_label, fm.fiscal_month_label, fm.fiscal_quarter_label 
			FROM base b 
			LEFT JOIN price_promo_opt_temp.%I fm 
			ON b.date = fm.date;	

	        CREATE INDEX idx_final_agg_date_%s ON price_promo_opt_temp.%I using btree(date);
	
			ANALYZE price_promo_opt_temp.%I;
	        ',
	        fnl_agg_tbl, fnl_agg_tbl, pdm_tbl_agg, fmt2_tbl, fdm_tbl,
	        temp_suffix, fnl_agg_tbl, fnl_agg_tbl
	    );
	    raise notice 'Final Aggregated ----- %', _query;
	    start_time := clock_timestamp();
	    execute _query;
	    end_time := clock_timestamp();
	    RAISE NOTICE 'Time taken Final Aggregated: %', end_time - start_time;    


		-- Build dynamic SQL query
		query_text := '
		WITH aggregated AS (
		    SELECT
		        CASE
		            WHEN GROUPING(fiscal_week) = 0 THEN ''Weekly''
		            WHEN GROUPING(fiscal_month) = 0 THEN ''Monthly''
		            WHEN GROUPING(fiscal_quarter) = 0 THEN ''Quarterly''
		            ELSE ''Total''
		        END AS time_tag,
		
		        CASE
		            WHEN GROUPING(fiscal_week) = 0 THEN fiscal_week_label
		            WHEN GROUPING(fiscal_month) = 0 THEN fiscal_month_label
		            WHEN GROUPING(fiscal_quarter) = 0 THEN fiscal_quarter_label
		            ELSE ''Total''
		        END AS xlabel,
		
		        CASE
		            WHEN GROUPING(fiscal_week) = 0 THEN fiscal_year*100+fiscal_week
		            WHEN GROUPING(fiscal_month) = 0 THEN fiscal_year*100+fiscal_month
		            WHEN GROUPING(fiscal_quarter) = 0 THEN fiscal_year*100+fiscal_quarter
		            ELSE 1
		        END AS fiscal_sort_value,
		
		        SUM(total_sales_units) as total_sales_units,
		        SUM(total_revenue) as total_revenue,
		        SUM(total_margin) as total_margin,
		        CASE WHEN SUM(total_revenue) = 0 THEN 0
		             ELSE SUM(total_margin) / SUM(total_revenue)
		        END AS total_margin_percentage,
		
		        SUM(actual_sales_units) as actual_sales_units,
		        SUM(actual_revenue) as actual_revenue,
		        SUM(actual_margin) as actual_margin,
		        CASE WHEN SUM(actual_revenue) = 0 THEN 0
		             ELSE SUM(actual_margin) / SUM(actual_revenue)
		        END AS actual_margin_percentage,
		
		        SUM(ly_sales_units) as ly_sales_units,
		        SUM(ly_revenue) as ly_revenue,
		        SUM(ly_margin) as ly_margin,
		        CASE WHEN SUM(ly_revenue) = 0 THEN 0
		             ELSE SUM(ly_margin) / SUM(ly_revenue)
		        END AS ly_margin_percentage,
		
		        SUM(mfp_sales_units) as mfp_sales_units,
		        SUM(mfp_revenue) as mfp_revenue,
		        SUM(mfp_margin) as mfp_margin,
		        CASE WHEN SUM(mfp_revenue) = 0 THEN 0
		             ELSE SUM(mfp_margin) / SUM(mfp_revenue)
		        END AS mfp_margin_percentage
		
		    FROM price_promo_opt_temp.'|| fnl_agg_tbl ||' fnl
		
		    GROUP BY GROUPING SETS (
		        (fiscal_year, fiscal_week, fiscal_week_label),
		        (fiscal_year, fiscal_month, fiscal_month_label),
		        (fiscal_year, fiscal_quarter, fiscal_quarter_label),
		        ()
		    )
		),
		
		combined_metrics AS (
		    SELECT
		        time_tag,
		        json_agg(
		            json_build_object(
		                ''time_label'', xlabel,
		
		                ''currency_id'', ' || _target_currency_id || ',
		                ''currency_name'', ''' || _currency_name || ''',
		                ''currency_symbol'', ''' || _currency_symbol || ''',
		
		                ''forecasted_sales_units'', ROUND(total_sales_units::numeric, 0),
		                ''forecasted_revenue'', ROUND(total_revenue::numeric, 0),
		                ''forecasted_margin'', ROUND(total_margin::numeric, 0),
		                ''forecasted_margin_percent'', ROUND((total_margin_percentage * 100)::numeric, 1),
		
		                ''actualized_sales_units'', ROUND(actual_sales_units::numeric, 0),
		                ''actualized_revenue'', ROUND(actual_revenue::numeric, 0),
		                ''actualized_margin'', ROUND(actual_margin::numeric, 0),
		                ''actualized_margin_percent'', ROUND((actual_margin_percentage * 100)::numeric, 1),
		
		                ''ly_sales_units'', ROUND(ly_sales_units::numeric, 0),
		                ''ly_revenue'', ROUND(ly_revenue::numeric, 0),
		                ''ly_margin'', ROUND(ly_margin::numeric, 0),
		                ''ly_margin_percent'', ROUND((ly_margin_percentage * 100)::numeric, 1),
		
		                ''plan_sales_units'', ROUND(mfp_sales_units::numeric, 0),
		                ''plan_revenue'', ROUND(mfp_revenue::numeric, 0),
		                ''plan_margin'', ROUND(mfp_margin::numeric, 0),
		                ''plan_margin_percent'', ROUND((mfp_margin_percentage * 100)::numeric, 1)
		            )::json
		            ORDER BY fiscal_sort_value
		        ) AS data
		    FROM aggregated
		    GROUP BY time_tag
		)
		
		SELECT json_object_agg(time_tag, data)::json AS result
		FROM combined_metrics;';
	
		RAISE NOTICE 'Final query text: %', query_text;

		-- Execute the query
    	EXECUTE query_text INTO result;

	END IF;
---------------------------------------------------------------------------------------------------------------------------------

    
    --Drop unlogged tables
    EXECUTE 'DROP TABLE IF EXISTS price_promo_opt_temp.' || pmf_tbl;
	EXECUTE 'DROP TABLE IF EXISTS price_promo_opt_temp.' || smf_tbl;
    EXECUTE 'DROP TABLE IF EXISTS price_promo_opt_temp.' || fdm_tbl;
    EXECUTE 'DROP TABLE IF EXISTS price_promo_opt_temp.' || cr_tbl;
	EXECUTE 'DROP TABLE IF EXISTS price_promo_opt_temp.' || fdc_tbl;
    EXECUTE 'DROP TABLE IF EXISTS price_promo_opt_temp.' || mf_tbl;
	EXECUTE 'DROP TABLE IF EXISTS price_promo_opt_temp.' || apd_tbl;
	EXECUTE 'DROP TABLE IF EXISTS price_promo_opt_temp.' || fmt_tbl;
	EXECUTE 'DROP TABLE IF EXISTS price_promo_opt_temp.' || fmt2_tbl;
    EXECUTE 'DROP TABLE IF EXISTS price_promo_opt_temp.' || pdm_tbl;
	EXECUTE 'DROP TABLE IF EXISTS price_promo_opt_temp.' || pdm_tbl_agg;
	EXECUTE 'DROP TABLE IF EXISTS price_promo_opt_temp.' || fnl_agg_tbl;

    RETURN result;
END;
$function$
;