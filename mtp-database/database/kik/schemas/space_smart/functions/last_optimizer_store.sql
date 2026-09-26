
--liquibase formatted sql
--changeset paras.jain@impactanalytics.co:MTP-61021 Fixing query runOnChange:true stripComments:false splitStatements:false context:MTP-61024 Fixing Query  labels:liquibase_project_start
--comment: MTP-61021 Fixing query
--rollback: SELECT 1


DROP FUNCTION IF Exists space_smart.last_optimizer_store(refcursor, jsonb, jsonb, text, text, text, text, text, text, text, text, text,text);

CREATE OR REPLACE FUNCTION space_smart.last_optimizer_store(input refcursor, filters jsonb, query_table jsonb, max_season text, prefixed_columns text, store_metric_where_clause text, store_attribute_filters_where_clause text, columns_based_on_level text, ly_or_lly_past_season_where_clause text, ly_or_lly_future_season_where_clause text, ly_or_lly_max_season text, on_clause text, compare_with text)
 RETURNS refcursor
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
BEGIN


    -- Build the combined query
    _query_combine := '
        WITH current_metrics AS (
            SELECT
                store_number,
                ' || columns_based_on_level || ',
                MAX(last_optimized_level) as last_optimized_level,
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
                    FROM space_smart.store_metrics ' || ly_or_lly_future_season_where_clause || '
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
                                            saf.store_format_new as center_format_type,
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
                "global".store_attributes_filter saf
            JOIN
                current_metrics cm ON saf.store_code = cm.store_number
            LEFT JOIN
                historical_metrics hm ON cm.store_number = hm.store_number
                AND ' || on_clause || '
            ' || store_attribute_filters_where_clause || '
        )
        SELECT * FROM final_result';

    
    --RAISE NOTICE '%', _query_combine;

    -- Build the additional table query
    _query_table_filters := global.form_table_query(query_table);
   --RAISE NOTICE '%',_query_combine || _query_table_filters;

    -- Combine and execute the final query
    OPEN input FOR EXECUTE _query_combine || _query_table_filters;
    RETURN input;
END;
$function$
;



