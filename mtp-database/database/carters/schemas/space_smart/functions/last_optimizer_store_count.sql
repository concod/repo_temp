--liquibase formatted sql
--changeset paras.jain@impactanalytics.co:MTP-65948 Adding temp table for last_optimizer_store_count runOnChange:true stripComments:false splitStatements:false context:MTP-65948 Adding temp table for last_optimizer_store_count labels:liquibase_project_start
--comment: MTP-65948 Adding temp table last_optimizer_store_count
--rollback: SELECT 1

DROP FUNCTION IF Exists space_smart.last_optimizer_store_count( jsonb, jsonb, text, text, text, text, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION space_smart.last_optimizer_store_count(filters jsonb, query_table jsonb, max_season text, prefixed_columns text, store_metric_where_clause text, store_attribute_filters_where_clause text, columns_based_on_level text, ly_or_lly_past_season_where_clause text, ly_or_lly_future_season_where_clause text, ly_or_lly_max_season text, on_clause text, compare_with text, temp_table_name text)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    _where text := null;
    _filter_data jsonb := filters->'filters';
    _limit int;
    _page int;
    _offset int;
    _query_combine text;
    _query_table_filters text;
   result JSON;
   v_gen_random_uuid text  := gen_random_uuid()::varchar;
BEGIN

    -- Build the combined query
	_query_table_filters := global.form_table_query(query_table);
    _query_combine := '
	CREATE TEMP TABLE ' || temp_table_name || ' as
			SELECT store_code,store_name,store_format_rollup,store_type, volume_cd,center_format_type, store_format_detail,
			q_str_sls_sqft, store_format_new, rtl_store_category_dsc,q_str_grade from
				"global".store_attributes_filter saf
			' || store_attribute_filters_where_clause || ';

	CREATE INDEX ' || temp_table_name || '_idx ON ' || temp_table_name || ' USING btree (store_code,store_name,store_format_rollup,store_type, volume_cd,center_format_type, store_format_detail,
			q_str_sls_sqft, store_format_new, rtl_store_category_dsc,q_str_grade);


        WITH current_metrics AS (
            SELECT
                store_number,
                ' || columns_based_on_level || ',
				max(last_optimized_level) as last_optimized_level,
                MAX(CASE WHEN season = ''' || max_season || ''' THEN store_parent_block ELSE '''' END) AS store_parent_block,
                MAX(CASE WHEN season = ''' || max_season || ''' THEN space_elasticity ELSE '''' END) AS space_elasticity,
                MAX(CASE WHEN season = ''' || max_season || ''' THEN store_group ELSE '''' END) AS store_group,
                MAX(CASE WHEN season = ''' || max_season || ''' THEN status ELSE '''' END) AS status,
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
            ' || store_metric_where_clause || '
            GROUP BY
                store_number, ' || columns_based_on_level || '
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
                    SELECT id, store_number, season, l4_name, gender, l3_name, l5_name, parent_block, store_parent_block, status, space_elasticity, sales, gm, forecasted_units, optimized_min_cc, optimized_max_cc, last_optimized, last_optimized_by, last_optimized_level, store_group, sellable_sqft, l0_name, l1_name, l2_name
                    FROM space_smart.store_metrics_actualized ' || ly_or_lly_past_season_where_clause || '
                    UNION ALL
                    SELECT id, store_number, season, l4_name, gender, l3_name, l5_name, parent_block, store_parent_block, status, space_elasticity, sales, gm, forecasted_units, optimized_min_cc, optimized_max_cc, last_optimized, last_optimized_by, last_optimized_level, store_group, sellable_sqft, l0_name, l1_name, l2_name
                    FROM space_smart.store_last_saved_version ' || ly_or_lly_future_season_where_clause || '
                ) AS metrics
            GROUP BY
                store_number, ' || columns_based_on_level || '
        ),
        final_result AS (
            SELECT
                saf.store_code as store_number,
                                            saf.store_name,
                                            saf.store_format_rollup,
                                            saf.store_type,
                                            saf.volume_cd,
                                            saf.center_format_type,
                                            saf.store_format_detail,
                                            saf.store_format_new,
                                            saf.rtl_store_category_dsc,
                                            saf.q_str_grade,
                                            saf.q_str_sls_sqft,
                                            cm.store_number AS current_store_number,
                                            ' || prefixed_columns || ',
                                            cm.space_elasticity as space_elasticity,
											cm.last_optimized_level as last_optimized_level,
                                            cm.store_group as store_group,
                                            cm.sellable_sqft as sellable_sqft_optimized,
                                            cm.sales_density as sales_density_optimized,
                                            cm.sales as sales_optimized,
                                            cm.gm as gm_optimized,
                                            cm.gm_density as gm_density_optimized,
                                            cm.forecasted_units as forecasted_units_optimized,
                                            cm.unit_density as unit_density_optimized,
                                            cm.optimized_min_cc as optimized_min_cc_optimized,
                                            cm.optimized_max_cc as optimized_max_cc_optimized,
                                            hm.sellable_sqft as sellable_sqft_'|| compare_with ||',
                                            hm.sales as sales_'|| compare_with ||',
                                            hm.gm as gm_'|| compare_with ||',
                                            hm.forecasted_units as forecasted_units_'|| compare_with ||',
                                            hm.optimized_min_cc as optimized_min_cc_'|| compare_with ||',
                                            hm.optimized_max_cc as optimized_max_cc_'|| compare_with ||',
                                            hm.sales_density as sales_density_'|| compare_with ||',
                                            hm.gm_density as gm_density_'|| compare_with ||',
                                            hm.unit_density as unit_density_'|| compare_with ||'
            FROM
                ' || temp_table_name || ' saf
            JOIN
                current_metrics cm ON saf.store_code = cm.store_number
            LEFT JOIN
                historical_metrics hm ON cm.store_number = hm.store_number
                AND ' || on_clause || '
        )

 select
	count(*)
from (select
	*
from
	final_result ' || _query_table_filters || ') as result';

	raise notice 'query -- %',_query_combine ;
    execute _query_combine
into
	result;

perform global.sp_log(v_gen_random_uuid, 'space_smart.last_optimizer_store_count', 'before returning _query_combine', _query_combine, jsonb_build_object('filters',$1, 'query_table',$2, 'max_season',$3, 'prefixed_columns',$4, 'store_metric_where_clause',$5, 'store_attribute_filters_where_clause',$6, 'columns_based_on_level',$7, 'ly_or_lly_past_season_where_clause',$8, 'ly_or_lly_future_season_where_clause',$9, 'ly_or_lly_max_season',$10, 'on_clause',$11, 'compare_with',$12, 'temp_table_name',$13));

return result;
END;
$function$
;
