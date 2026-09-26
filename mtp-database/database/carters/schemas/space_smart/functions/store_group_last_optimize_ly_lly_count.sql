--liquibase formatted sql
--changeset paras.jain@impactanalytics.co:MTP-108204_removing_unwanted_sp  runOnChange:true stripComments:false splitStatements:false context:added-missing-params labels:liquibase_project_start
--comment: MTP-108204_removing_unwanted_sp
--rollback: SELECT 1


DROP FUNCTION IF Exists space_smart.store_group_last_optimize_ly_lly_count(jsonb, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text);
DROP FUNCTION IF Exists space_smart.store_group_last_optimize_ly_lly_count(jsonb, text, text, text, text, text, text, text, text, text, text);
DROP FUNCTION IF Exists space_smart.store_group_last_optimize_ly_lly_count(jsonb, text, text, text, text, text, text, text, text, text, text, text, text, text, text);
DROP FUNCTION IF Exists space_smart.store_group_last_optimize_ly_lly_count(jsonb, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text);
DROP FUNCTION IF Exists space_smart.store_group_last_optimize_ly_lly_count(refcursor, jsonb, text, text, text, text, text, text, text, text, text, text);


CREATE OR REPLACE FUNCTION space_smart.store_group_last_optimize_ly_lly_count(jsonb, max_season text, ly_or_lly_max_season text, columns_based_on_level text, store_optimized_where_clause text, ly_or_lly_past_season_where_clause text, on_clause text, ly_or_lly_future_season_where_clause text, prefixed_columns_str text, store_attribute_filters_where_clause text, compare_with text, temp_table text, current_table_name text, historical_past_table_name text, historical_current_table_name text, pc_partition_var text, pc_partition_var_sellable text)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    _query_table_filters TEXT := '';
    _query_combine TEXT;
    _input_json JSON;
    _input_data JSONB;
    _filter_data JSONB;
    _where TEXT;
   result JSON;
   v_gen_random_uuid text  := gen_random_uuid()::varchar;
BEGIN
   -- Combine the query with proper variable substitution
	 _query_table_filters := global.form_table_query($1);
    _query_combine :=
        '
CREATE TEMP TABLE '|| temp_table ||' as
			SELECT store_code, master_size as store_size from
				"global".store_attributes_filter saf
	' || store_attribute_filters_where_clause || ';
			CREATE INDEX '|| temp_table ||'_idx ON '||temp_table|| ' USING btree (store_code, store_size);



WITH current_metrics AS (
            SELECT
                store_number,
                ' || columns_based_on_level || ',
				MAX(CASE WHEN season = ''' || max_season || ''' THEN parent_block ELSE '''' END) AS parent_block,
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
                '|| current_table_name ||'
                ' || store_optimized_where_clause || '
            GROUP BY
                store_number, ' || columns_based_on_level || '
        ),
        historical_metrics AS (
            SELECT
                store_number,
                ' || columns_based_on_level || ',
				MAX(CASE WHEN season = ''' || ly_or_lly_max_season || ''' THEN parent_block ELSE '''' END) AS parent_block,
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
		' || columns_based_on_level || ',
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
		sellable_sqft,
		l0_name,
		l1_name,
		l2_name FROM '|| historical_past_table_name ||'
                    ' || ly_or_lly_past_season_where_clause || '
                    UNION ALL
                    SELECT
				id,
		store_number,
		season,
		'|| columns_based_on_level || ',
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
		sellable_sqft,
		l0_name,
		l1_name,
		l2_name
 FROM '|| historical_current_table_name ||'
                    ' || ly_or_lly_future_season_where_clause || '
                ) AS metrics
            GROUP BY store_number, ' || columns_based_on_level || '
        ) ,
        secondry AS (
            SELECT
                saf.store_size,
                cm.store_number AS store_number,
                ' || prefixed_columns_str || ',
                cm.sellable_sqft AS sellable_sqft_optimized,
                cm.sales_density AS sales_density_optimized,
                cm.sales AS sales_optimized,
                cm.gm AS gm_optimized,
                cm.gm_density AS gm_density_optimized,
                cm.forecasted_units AS forecasted_units_optimized,
                cm.unit_density AS unit_density_optimized,
                cm.optimized_min_cc AS optimized_min_cc_optimized,
                cm.optimized_max_cc AS optimized_max_cc_optimized,
                cm.parent_block as parent_block_optimized,
                cm.sellable_sqft/25 as ml_per_parent_block_optimized,
                hm.parent_block as parent_block_'|| compare_with ||',
                hm.sellable_sqft/25 as ml_per_parent_block_'|| compare_with ||',
                hm.sellable_sqft AS sellable_sqft_'|| compare_with ||',
                hm.sales AS sales_'|| compare_with ||',
                hm.gm AS gm_'|| compare_with ||',
                hm.forecasted_units AS forecasted_units_'|| compare_with ||',
                hm.optimized_min_cc AS optimized_min_cc_'|| compare_with ||',
                hm.optimized_max_cc AS optimized_max_cc_'|| compare_with ||',
                hm.sales_density AS sales_density_'|| compare_with ||',
                hm.gm_density AS gm_density_'|| compare_with ||',
                hm.unit_density AS unit_density_'|| compare_with ||',
				cm.sellable_sqft / nullif(sum(cm.sellable_sqft) over('|| pc_partition_var ||' ),0) as space_contribution_optimized,
				hm.sellable_sqft / nullif(sum(hm.sellable_sqft) over( '|| pc_partition_var ||'  ),0) as space_contribution_'|| compare_with ||',
				sum(cm.sellable_sqft) over(' || pc_partition_var ||') as age_sellable_sqft_optimized,
				sum(hm.sellable_sqft) over(' || pc_partition_var ||') as age_sellable_sqft_' || compare_with ||'
            FROM
                '|| temp_table ||' saf
            JOIN current_metrics cm ON saf.store_code = cm.store_number
            LEFT JOIN historical_metrics hm ON cm.store_number = hm.store_number
            AND ' || on_clause || '

        ),
        p AS (
select
		sum(sellable_sqft_optimized) over('|| pc_partition_var_sellable || '  ) as total_sellable_sqft_optimized,
		sum(sellable_sqft_'||compare_with||') over( '|| pc_partition_var_sellable || ' ) as total_sellable_sqft_'||compare_with||',
           	sellable_sqft_optimized/25 as ml_per_parent_block_optimized,
	    	sellable_sqft_'|| compare_with ||'/25 as ml_per_parent_block_'|| compare_with ||',
				*
from (
            SELECT
                store_size,
                ' || columns_based_on_level || ',
                COUNT(DISTINCT(store_number)) AS stores,

		AVG(sellable_sqft_optimized) as sellable_sqft_optimized,
		AVG(sellable_sqft_'|| compare_with ||' )as sellable_sqft_'|| compare_with ||',
		AVG(space_contribution_optimized) as space_contribution_optimized,
		AVG(space_contribution_'|| compare_with ||' ) as space_contribution_'|| compare_with ||' ,
				AVG(age_sellable_sqft_optimized) as age_sellable_sqft_optimized,
				AVG(age_sellable_sqft_' || compare_with ||') as age_sellable_sqft_' || compare_with ||',

                max(parent_block_'|| compare_with ||') as parent_block_'|| compare_with ||',
                max(parent_block_optimized) as parent_block_optimized,
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
                 store_size , ' || columns_based_on_level || '
        )as current)
		select count(*) from (
        SELECT
            p.*,
            sales_'|| compare_with ||' / NULLIF(sellable_sqft_'|| compare_with ||', 0) AS sales_density_'|| compare_with ||',
            sales_optimized / NULLIF(sellable_sqft_optimized, 0) AS sales_density_optimized,
            gm_'|| compare_with ||' / NULLIF(sellable_sqft_'|| compare_with ||', 0) AS gm_density_'|| compare_with ||',
            gm_optimized / NULLIF(sellable_sqft_optimized, 0) AS gm_density_optimized,
            forecasted_units_'|| compare_with ||' / NULLIF(sellable_sqft_'|| compare_with ||', 0) AS unit_density_'|| compare_with ||',
            forecasted_units_optimized / NULLIF(sellable_sqft_optimized, 0) AS unit_density_optimized
        FROM
            p ' || _query_table_filters ||') as result
';

	raise notice 'query -- %', _query_combine;

    -- Apply additional filters
    execute _query_combine
into
	result;

 perform global.sp_log(v_gen_random_uuid, 'space_smart.store_group_last_optimize_ly_lly_count', 'before returning _query_combine', _query_combine, jsonb_build_object('input',$1, 'max_season',$2, 'ly_or_lly_max_season',$3, 'columns_based_on_level',$4, 'store_optimized_where_clause',$5, 'ly_or_lly_past_season_where_clause',$6, 'on_clause',$7, 'ly_or_lly_future_season_where_clause',$8, 'prefixed_columns_str',$9, 'store_attribute_filters_where_clause',$10, 'compare_with',$11, 'temp_table',$12, 'current_table_name',$13, 'historical_past_table_name',$14, 'historical_current_table_name',$15));

return result;
END
$function$
;
