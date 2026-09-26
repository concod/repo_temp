--liquibase formatted sql
--changeset paras.jain@impactanalytics.co:MTP-104259_Adding_pb_change_block runOnChange:true stripComments:false splitStatements:false context:MTP-81803_Adding_Constraint labels:liquibase_project_start
--comment: MTP-104259_Adding_pb_change_block
--rollback: SELECT 1


DROP FUNCTION IF Exists space_smart.last_optimizer_store_count_age_ct(jsonb, jsonb, text, text, text, text, text, text, text, text, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION space_smart.last_optimizer_store_count_age_ct(filters jsonb, query_table jsonb, max_season text, prefixed_columns text, store_metric_where_clause text, store_attribute_filters_where_clause text, columns_based_on_level text, ly_or_lly_past_season_where_clause text, ly_or_lly_future_season_where_clause text, ly_or_lly_max_season text, on_clause text, compare_with text, temp_table_name text, current_table_name text, historical_table_name text, pc_partition_var text, constraint_where_clause text)
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
BEGIN

    -- Build the combined query
	_query_table_filters := global.form_table_query(query_table);
    _query_combine := '
	CREATE TEMP TABLE ' || temp_table_name || ' as
			SELECT store_code,store_name,store_format_rollup,store_type, volume_cd,center_format_type, store_format_detail,
			q_str_sls_sqft, store_format_new,store_initiative, rtl_store_category_dsc,q_str_grade,master_size,sellable_sqft from
				"global".store_attributes_filter saf
			' || store_attribute_filters_where_clause || ';

	CREATE INDEX ' || temp_table_name || '_idx ON ' || temp_table_name || ' USING btree (store_code,store_name,store_format_rollup,store_type, volume_cd,center_format_type, store_format_detail,
			q_str_sls_sqft, store_format_new,store_initiative, rtl_store_category_dsc,q_str_grade,master_size, sellable_sqft);

        with constraint_data as (
            SELECT sca.store_code,sca.l4_name,parent_block_min,parent_block_max,
            spb_min.min_sqft::FLOAT/coalesce(nullif(sellable_sqft,0),q_str_sls_sqft)::FLOAT as min_sqft_per,
             spb_max.max_sqft::FLOAT/coalesce(nullif(sellable_sqft,0),q_str_sls_sqft)::FLOAT as max_sqft_per FROM space_smart.space_constraints_age sca
            join ' || temp_table_name || ' tm on sca.store_code = tm.store_code
            left join space_smart.space_parent_block spb_min on spb_min.l4_name = sca.l4_name and spb_min.parent_block = sca.parent_block_min
            left join space_smart.space_parent_block spb_max on spb_max.l4_name = sca.l4_name and spb_max.parent_block = sca.parent_block_max
            '|| constraint_where_clause ||'
            ),

        current_metrics AS (
			select
				sellable_sqft / nullif(sum(sellable_sqft) over(partition by store_number, ' || pc_partition_var || ' ),0) as space_contribution,
				cast(sum(sellable_sqft) over(partition by store_number, ' || pc_partition_var ||') as int) as age_sellable_sqft_optimized,
                sum(sellable_sqft) over(partition by store_number, ' || pc_partition_var || ') as total_sellable_sqft,
				* from (
            SELECT
                store_number,
                ' || columns_based_on_level || ',
				max(last_optimized_level) as last_optimized_level,
                max(case when season = ''' || max_season || ''' then parent_block else '''' end) as parent_block,
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
                '|| current_table_name || '
            ' || store_metric_where_clause || '
            GROUP BY
                store_number, ' || columns_based_on_level || '
        )as current),
        historical_metrics AS (
			select
				sellable_sqft / nullif(sum(sellable_sqft) over(partition by store_number , ' || pc_partition_var || ' ),0) as space_contribution,
				cast(sum(sellable_sqft) over(partition by store_number ,' || pc_partition_var ||') as int) as age_sellable_sqft,
				sum(sellable_sqft) over(partition by store_number , ' || pc_partition_var || ') as total_sellable_sqft,
				* from (
            SELECT
                store_number,
                ' || columns_based_on_level || ',
                max(case when season = ''' || ly_or_lly_max_season || ''' then parent_block else '''' end) as parent_block,
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
                    SELECT id, store_number, season, '|| columns_based_on_level ||', parent_block, store_parent_block, status, space_elasticity, sales, gm, forecasted_units, optimized_min_cc, optimized_max_cc, last_optimized, last_optimized_by, store_group, sellable_sqft, l0_name, l1_name, l2_name
                    FROM '|| historical_table_name ||' ' || ly_or_lly_past_season_where_clause || '
                    UNION ALL
                    SELECT id, store_number, season, '|| columns_based_on_level ||', parent_block, store_parent_block, status, space_elasticity, sales, gm, forecasted_units, optimized_min_cc, optimized_max_cc, last_optimized, last_optimized_by, store_group, sellable_sqft, l0_name, l1_name, l2_name
                    FROM '|| current_table_name ||'  ' || ly_or_lly_future_season_where_clause || '
                ) AS metrics
            GROUP BY
                store_number, ' || columns_based_on_level || '
        ) as history),
        final_result AS (
            SELECT
            	cd.parent_block_max as max_pb_constraint,
                cd.parent_block_min as min_pb_constraint,
                cd.min_sqft_per,
                cd.max_sqft_per,
                saf.store_code as store_number,
				saf.store_initiative,
                                            saf.store_name,
                                            saf.store_format_rollup,
                                            saf.master_size as store_size,
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
											cm.parent_block as parent_block_optimized,
                                            cm.sellable_sqft/25 as ml_per_parent_block_optimized,
                                            cm.gm_density as gm_density_optimized,
                                            cm.forecasted_units as forecasted_units_optimized,
                                            cm.unit_density as unit_density_optimized,
                                            cm.optimized_min_cc as optimized_min_cc_optimized,
                                            cm.optimized_max_cc as optimized_max_cc_optimized,
											cm.space_contribution as space_contribution_optimized,
											cm.total_sellable_sqft as total_sellable_sqft_optimized,
                                            hm.parent_block as parent_block_'|| compare_with ||',
											hm.space_contribution as space_contribution_'|| compare_with ||',
                                            hm.sellable_sqft/25 as ml_per_parent_block_'|| compare_with ||',
                                            hm.sellable_sqft as sellable_sqft_'|| compare_with ||',
											hm.total_sellable_sqft as total_sellable_sqft_'|| compare_with ||',
                                            hm.sales as sales_'|| compare_with ||',
                                            hm.gm as gm_'|| compare_with ||',
                                            hm.forecasted_units as forecasted_units_'|| compare_with ||',
                                            hm.optimized_min_cc as optimized_min_cc_'|| compare_with ||',
                                            hm.optimized_max_cc as optimized_max_cc_'|| compare_with ||',
                                            hm.sales_density as sales_density_'|| compare_with ||',
                                            hm.gm_density as gm_density_'|| compare_with ||',
                                            hm.unit_density as unit_density_'|| compare_with ||',
											hm.age_sellable_sqft as age_sellable_sqft_'|| compare_with ||',
											cm.age_sellable_sqft_optimized as age_sellable_sqft_optimized,
    CASE
        WHEN cm.parent_block IS DISTINCT FROM hm.parent_block THEN ''Y''
        ELSE ''N''
    END as pb_change_flag

            FROM
                ' || temp_table_name || ' saf
            JOIN
                current_metrics cm ON saf.store_code = cm.store_number
            LEFT JOIN
                historical_metrics hm ON cm.store_number = hm.store_number
                AND ' || on_clause || '
            join constraint_data cd on cd.store_code = cm.store_number and cd.l4_name = cm.l4_name
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

return result;

perform global.sp_log(v_gen_random_uuid, 'space_smart.last_optimizer_store_count_age_ct', 'after returning _query_combine', _query_combine, jsonb_build_object('filters',$1, 'query_table',$2, 'max_season',$3, 'prefixed_columns',$4, 'store_metric_where_clause',$5, 'store_attribute_filters_where_clause',$6, 'columns_based_on_level',$7, 'ly_or_lly_past_season_where_clause',$8, 'ly_or_lly_future_season_where_clause',$9, 'ly_or_lly_max_season',$10, 'on_clause',$11, 'compare_with',$12, 'temp_table_name',$13, 'current_table_name',$14, 'historical_table_name',$15, 'pc_partition_var',$16));

END;
$function$
;
