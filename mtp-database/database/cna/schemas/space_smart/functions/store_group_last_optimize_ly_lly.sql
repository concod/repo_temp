
--liquibase formatted sql
--changeset paras.jain@impactanalytics.co liquibase:MTP-60077 Adding one column runOnChange:true stripComments:false splitStatements:false context:MTP-60077 Adding new column labels:liquibase_project_start
--comment: MTP-60077 Adding one column
--rollback: SELECT 1

DROP FUNCTION IF Exists space_smart.store_group_last_optimize_ly_lly(refcursor, jsonb, text, text, text, text, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION space_smart.store_group_last_optimize_ly_lly(input refcursor, jsonb, max_season text, ly_or_lly_max_season text, columns_based_on_level text, store_optimized_where_clause text, ly_or_lly_past_season_where_clause text, on_clause text, ly_or_lly_future_season_where_clause text, prefixed_columns_str text, store_attribute_filters_where_clause text, compare_with text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
    _query_table_filters TEXT := '';
    _query_combine TEXT;
    _input_json JSON;
    _input_data JSONB;
    _filter_data JSONB;
    _where TEXT;
BEGIN
    -- Combine the query with proper variable substitution
    _query_combine :=
        'WITH current_metrics AS (
            SELECT
                store_number,
                ' || columns_based_on_level || ',
                max(last_optimized_level) as last_optimized_level,
                MAX(CASE WHEN season = ''' || max_season || ''' THEN store_group ELSE '''' END) AS store_group,
                SUM(CASE WHEN season = ''' || max_season || ''' THEN sellable_sqft ELSE 0 END) AS sellable_sqft,
                SUM(sales) / NULLIF(SUM(CASE WHEN season = ''' || max_season || ''' THEN sellable_sqft ELSE 0 END), 0) AS sales_density,
                SUM(sales) AS sales,
                SUM(gm) AS gm,
                SUM(gm) / NULLIF(SUM(CASE WHEN season = ''' || max_season || ''' THEN sellable_sqft ELSE 0 END), 0) AS gm_density,
                SUM(forecasted_units) AS forecasted_units,
                SUM(forecasted_units) / NULLIF(SUM(CASE WHEN season = ''' || max_season || ''' THEN sellable_sqft ELSE 0 END), 0) AS unit_density,
                SUM(CASE WHEN season = ''' || max_season || ''' THEN optimized_min_cc ELSE 0 END) AS optimized_min_cc,
                SUM(CASE WHEN season = ''' || max_season || ''' THEN optimized_max_cc ELSE 0 END) AS optimized_max_cc
            FROM
                space_smart.store_last_saved_version
                ' || store_optimized_where_clause || '
            GROUP BY
                store_number, store_group, ' || columns_based_on_level || '
        ),
        historical_metrics AS (
            SELECT
                store_number,
                ' || columns_based_on_level || ',
                SUM(CASE WHEN season = ''' || ly_or_lly_max_season || ''' THEN sellable_sqft ELSE 0 END) AS sellable_sqft,
                SUM(sales) / NULLIF(SUM(CASE WHEN season = ''' || ly_or_lly_max_season || ''' THEN sellable_sqft ELSE 0 END), 0) AS sales_density,
                SUM(sales) AS sales,
                SUM(gm) AS gm,
                SUM(gm) / NULLIF(SUM(CASE WHEN season = ''' || ly_or_lly_max_season || ''' THEN sellable_sqft ELSE 0 END), 0) AS gm_density,
                SUM(forecasted_units) AS forecasted_units,
                SUM(forecasted_units) / NULLIF(SUM(CASE WHEN season = ''' || ly_or_lly_max_season || ''' THEN sellable_sqft ELSE 0 END), 0) AS unit_density,
                SUM(CASE WHEN season = ''' || ly_or_lly_max_season || ''' THEN optimized_min_cc ELSE 0 END) AS optimized_min_cc,
                SUM(CASE WHEN season = ''' || ly_or_lly_max_season || ''' THEN optimized_max_cc ELSE 0 END) AS optimized_max_cc,
                SUM(forecasted_units) / NULLIF(SUM(sellable_sqft), 0) AS unit_density_ly
            FROM
                (
                    SELECT
				id,
		store_number,
		season,
		l4_name,
		gender,
		l3_name,
		l5_name,
		parent_block,
		store_parent_block,
		status,
		space_elasticity,
		sales,
		gm,
		forecasted_units,
		optimized_min_cc,
		optimized_max_cc,
		last_optimized,
		last_optimized_by,
		last_optimized_level,
		store_group,
		sellable_sqft,
		l0_name,
		l1_name,
		l2_name FROM space_smart.store_metrics_actualized
                    ' || ly_or_lly_past_season_where_clause || '
                    UNION ALL
                    SELECT
				id,
		store_number,
		season,
		l4_name,
		gender,
		l3_name,
		l5_name,
		parent_block,
		store_parent_block,
		status,
		space_elasticity,
		sales,
		gm,
		forecasted_units,
		optimized_min_cc,
		optimized_max_cc,
		last_optimized,
		last_optimized_by,
		last_optimized_level,
		store_group,
		sellable_sqft,
		l0_name,
		l1_name,
		l2_name
 FROM space_smart.store_metrics
                    ' || ly_or_lly_future_season_where_clause || '
                ) AS metrics
            GROUP BY store_number, ' || columns_based_on_level || '
        ),
        secondry AS (
            SELECT
                cm.store_number AS store_number,
                ' || prefixed_columns_str || ',
                cm.store_group AS store_group,
                cm.sellable_sqft AS sellable_sqft_optimized,
                cm.sales_density AS sales_density_optimized,
                cm.sales AS sales_optimized,
                cm.gm AS gm_optimized,
                cm.last_optimized_level as last_optimized_level,
                cm.gm_density AS gm_density_optimized,
                cm.forecasted_units AS forecasted_units_optimized,
                cm.unit_density AS unit_density_optimized,
                cm.optimized_min_cc AS optimized_min_cc_optimized,
                cm.optimized_max_cc AS optimized_max_cc_optimized,
                hm.sellable_sqft AS sellable_sqft_'|| compare_with ||',
                hm.sales AS sales_'|| compare_with ||',
                hm.gm AS gm_'|| compare_with ||',
                hm.forecasted_units AS forecasted_units_'|| compare_with ||',
                hm.optimized_min_cc AS optimized_min_cc_'|| compare_with ||',
                hm.optimized_max_cc AS optimized_max_cc_'|| compare_with ||',
                hm.sales_density AS sales_density_'|| compare_with ||',
                hm.gm_density AS gm_density_'|| compare_with ||',
                hm.unit_density AS unit_density_'|| compare_with ||'
            FROM
                "global".store_attributes_filter saf
            JOIN current_metrics cm ON saf.store_code = cm.store_number
            LEFT JOIN historical_metrics hm ON cm.store_number = hm.store_number
            AND ' || on_clause || '
            ' || store_attribute_filters_where_clause || '
        ),
        p AS (
            SELECT
                store_group,
                ' || columns_based_on_level || ',
                max(last_optimized_level) as last_optimized_level,
                COUNT(DISTINCT(store_number)) AS stores,
                SUM(sellable_sqft_optimized * forecasted_units_optimized) / NULLIF(SUM(forecasted_units_optimized), 0) AS sellable_sqft_optimized,
                SUM(sellable_sqft_'|| compare_with ||' * forecasted_units_'|| compare_with ||') / NULLIF(SUM(forecasted_units_'|| compare_with ||'), 0) AS sellable_sqft_'|| compare_with ||',
                SUM(forecasted_units_optimized * forecasted_units_optimized) / NULLIF(SUM(forecasted_units_optimized), 0) AS forecasted_units_optimized,
                SUM(forecasted_units_'|| compare_with ||' * forecasted_units_'|| compare_with ||') / NULLIF(SUM(forecasted_units_'|| compare_with ||'), 0) AS forecasted_units_'|| compare_with ||',
                SUM(optimized_min_cc_optimized * forecasted_units_optimized) / NULLIF(SUM(forecasted_units_optimized), 0) AS optimized_min_cc_optimized,
                SUM(optimized_min_cc_'|| compare_with ||' * forecasted_units_'|| compare_with ||') / NULLIF(SUM(forecasted_units_'|| compare_with ||'), 0) AS optimized_min_cc_'|| compare_with ||',
                SUM(optimized_max_cc_optimized * forecasted_units_optimized) / NULLIF(SUM(forecasted_units_optimized), 0) AS optimized_max_cc_optimized,
                SUM(optimized_max_cc_'|| compare_with ||' * forecasted_units_'|| compare_with ||') / NULLIF(SUM(forecasted_units_'|| compare_with ||'), 0) AS optimized_max_cc_'|| compare_with ||',
                SUM(gm_optimized * forecasted_units_optimized) / NULLIF(SUM(forecasted_units_optimized), 0) AS gm_optimized,
                SUM(gm_'|| compare_with ||' * forecasted_units_'|| compare_with ||') / NULLIF(SUM(forecasted_units_'|| compare_with ||'), 0) AS gm_'|| compare_with ||',
                SUM(sales_optimized * forecasted_units_optimized) / NULLIF(SUM(forecasted_units_optimized), 0) AS sales_optimized,
                SUM(sales_'|| compare_with ||' * forecasted_units_'|| compare_with ||') / NULLIF(SUM(forecasted_units_'|| compare_with ||'), 0) AS sales_'|| compare_with ||'
            FROM
                secondry
            GROUP BY
                store_group, ' || columns_based_on_level || '
        )
        SELECT
            p.*,
            sales_'|| compare_with ||' / NULLIF(sellable_sqft_'|| compare_with ||', 0) AS sales_density_'|| compare_with ||',
            sales_optimized / NULLIF(sellable_sqft_optimized, 0) AS sales_density_optimized,
            gm_'|| compare_with ||' / NULLIF(sellable_sqft_'|| compare_with ||', 0) AS gm_density_'|| compare_with ||',
            gm_optimized / NULLIF(sellable_sqft_optimized, 0) AS gm_density_optimized,
            forecasted_units_'|| compare_with ||' / NULLIF(sellable_sqft_'|| compare_with ||', 0) AS unit_density_'|| compare_with ||',
            forecasted_units_optimized / NULLIF(sellable_sqft_optimized, 0) AS unit_density_optimized
        FROM
            p';

    -- Apply additional filters
    _query_table_filters := global.form_table_query($2);
    RAISE NOTICE 'query -- %', _query_combine || _query_table_filters;

    -- Execute the query and return the cursor
    OPEN input FOR EXECUTE _query_combine || _query_table_filters;
    RETURN input;
END
$function$
;
