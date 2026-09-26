--liquibase formatted sql
--changeset paras.jain@impactanalytics.co:updating_density_col_sellable runOnChange:true stripComments:false splitStatements:false context:MTP-81803_Adding_Constraint labels:liquibase_project_start
--comment: updating_kid_age_name_to_kids
--rollback: SELECT 1


DROP FUNCTION IF Exists space_smart.last_optimize_base_age_ct(jsonb, text, text, text, text, text, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION space_smart.last_optimize_base_age_ct(filters jsonb, columns_based_on_level text, max_season text, store_metric_where_clause text, store_attribute_filters_where_clause text, store_last_saved_version_where_clause text, on_clause text, temp_table_name text, current_table_name text, historical_table_name text, pc_partition_var text, prefixed_columns_str text, constraint_where_clause text)
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
    _query_table_filters := global.form_table_query(filters);

    _query_combine := '
    CREATE TEMP TABLE ' || temp_table_name || ' AS
        SELECT store_name, store_format_rollup, store_type, volume_cd, center_format_type, store_format_detail, store_format_new,
               rtl_store_category_dsc, q_str_grade,store_initiative, q_str_sls_sqft, store_code , master_size, sellable_sqft
        FROM "global".store_attributes_filter saf
        ' || store_attribute_filters_where_clause || ';

    CREATE INDEX ' || temp_table_name || '_idx ON ' || temp_table_name || ' USING btree (
        store_name, store_format_rollup, store_type, volume_cd, center_format_type, store_format_detail, store_format_new,
        rtl_store_category_dsc, q_str_grade,store_initiative, q_str_sls_sqft, store_code, master_size, sellable_sqft
    );

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
				sellable_sqft_optimized / nullif(sum(sellable_sqft_optimized) over(partition by ' || pc_partition_var || ' ),0) as space_contribution_optimized,
				sum(sellable_sqft_optimized) over(partition by  ' || pc_partition_var ||') as age_sellable_sqft_optimized,
				sum(sellable_sqft_optimized) over(partition by ' || pc_partition_var || ' ) as total_sellable_sqft,
				*
from (
        SELECT
            store_number,
            ' || columns_based_on_level || ',
            max(space_elasticity) AS space_elasticity,
			max(case when season = ''' || max_season || ''' then parent_block else '''' end) as parent_block,
            SUM(CASE WHEN season = ''' || max_season || ''' THEN slsv.sellable_sqft ELSE 0 END) AS sellable_sqft_optimized,
            SUM(slsv.sales) AS sales_optimized,
            SUM(slsv.gm) AS gm_optimized,
            SUM(forecasted_units) AS forecasted_units_optimized,
            SUM(CASE WHEN season = ''' || max_season || ''' THEN optimized_min_cc ELSE 0 END) AS optimized_min_cc_optimized,
            SUM(CASE WHEN season = ''' || max_season || ''' THEN optimized_max_cc ELSE 0 END) AS optimized_max_cc_optimized,

            SUM(sales) / (nullif(SUM(case when season = ''' || max_season || '''  then slsv.sellable_sqft else 0 end), 0) *
        	    tm.sellable_sqft / nullif(SUM(SUM(case when season = ''' || max_season || '''  then slsv.sellable_sqft else 0 end)) OVER (PARTITION BY store_number), 0)) as sales_density_optimized,
    	    SUM(gm) / (nullif(SUM(case when season = ''' || max_season || '''  then slsv.sellable_sqft else 0 end), 0) *
        	    tm.sellable_sqft / nullif(SUM(SUM(case when season = ''' || max_season || '''  then slsv.sellable_sqft else 0 end)) OVER (PARTITION BY store_number), 0)) as gm_density_optimized,
    	    SUM(forecasted_units) / (nullif(SUM(case when season = ''' || max_season || '''  then slsv.sellable_sqft else 0 end), 0) *
        	    tm.sellable_sqft / nullif(SUM(SUM(case when season = ''' || max_season || '''  then slsv.sellable_sqft else 0 end)) OVER (PARTITION BY store_number), 0)) as unit_density_optimized


        FROM ' || current_table_name || ' slsv
        join  ' || temp_table_name || ' tm on slsv.store_number = tm.store_code
        ' || store_last_saved_version_where_clause || '
        GROUP BY
        tm.sellable_sqft,
            store_number, ' || columns_based_on_level || '
        ORDER by
		store_number,
        case
            when l4_name = ''INFANT'' then 1
            when l4_name = ''TODDLER'' then 2
            when l4_name = ''KID'' then 3
            else 4
        end
    ) as current),
    historical_metrics AS (
select
				sellable_sqft_base / nullif(sum(sellable_sqft_base) over(partition by ' || pc_partition_var || ' ),0) as space_contribution_base,
				sum(sellable_sqft_base) over(partition by  ' || pc_partition_var ||') as age_sellable_sqft_base,
				sum(sellable_sqft_base) over(partition by ' || pc_partition_var || ' ) as total_sellable_sqft,
				*
from (
        SELECT
            store_number ,
            ' || columns_based_on_level || ',
            max(case when season = ''' || max_season || ''' then parent_block else '''' end) as parent_block,
            SUM(CASE WHEN season = ''' || max_season || ''' THEN sm.sellable_sqft ELSE 0 END) AS sellable_sqft_base,

            SUM(sm.sales) AS sales_base,
            SUM(sm.gm) AS gm_base,
            SUM(forecasted_units) AS forecasted_units_base,
            SUM(CASE WHEN season = ''' || max_season || ''' THEN optimized_min_cc ELSE 0 END) AS optimized_min_cc_base,
            SUM(CASE WHEN season = ''' || max_season || ''' THEN optimized_max_cc ELSE 0 END) AS optimized_max_cc_base,

            SUM(sales) / (nullif(SUM(case when season = ''' || max_season || ''' then sm.sellable_sqft else 0 end), 0) *
                    tm.sellable_sqft / nullif(SUM(SUM(case when season = ''' || max_season || ''' then sm.sellable_sqft else 0 end)) OVER (PARTITION BY store_number), 0)) as sales_density_base,
    SUM(gm) / (nullif(SUM(case when season = ''' || max_season || ''' then sm.sellable_sqft else 0 end), 0) *
        tm.sellable_sqft / nullif(SUM(SUM(case when season = ''' || max_season || ''' then sm.sellable_sqft else 0 end)) OVER (PARTITION BY store_number), 0)) as gm_density_base,
    SUM(forecasted_units) / (nullif(SUM(case when season = ''' || max_season || ''' then sm.sellable_sqft else 0 end), 0) *
        tm.sellable_sqft / nullif(SUM(SUM(case when season = ''' || max_season || ''' then sm.sellable_sqft else 0 end)) OVER (PARTITION BY store_number), 0)) as unit_density_base


        FROM ' || historical_table_name || ' sm
        join  ' || temp_table_name || ' tm on sm.store_number = tm.store_code
        ' || store_metric_where_clause || '
        GROUP BY
        tm.sellable_sqft,
            sm.store_number, ' || columns_based_on_level || '
        ORDER by
		store_number,

        case
            when l4_name = ''INFANT'' then 1
            when l4_name = ''TODDLER'' then 2
            when l4_name = ''KID'' then 3
            else 4
        end
    ) as history),
    final_result AS (
        SELECT
        	cd.parent_block_max as max_pb_constraint,
            cd.parent_block_min as min_pb_constraint,
            cd.min_sqft_per,
            cd.max_sqft_per,
            saf.store_code AS store_number,
            saf.store_name,
saf.store_initiative,
            saf.store_format_rollup,
            saf.store_type,
            saf.volume_cd,
            saf.center_format_type,
            saf.store_format_detail,
            saf.store_format_new,
            saf.rtl_store_category_dsc,
            saf.q_str_grade,
            saf.q_str_sls_sqft,
            saf.master_size as store_size,
			'|| prefixed_columns_str||',
            cm.store_number AS current_store_number,
            cm.space_elasticity AS space_elasticity,
            cm.sellable_sqft_optimized AS sellable_sqft_optimized,
            cm.sales_density_optimized AS sales_density_optimized,
            cm.sales_optimized AS sales_optimized,
            cm.gm_optimized AS gm_optimized,
            cm.gm_density_optimized AS gm_density_optimized,
            cm.forecasted_units_optimized AS forecasted_units_optimized,
            cm.unit_density_optimized AS unit_density_optimized,
            cm.optimized_min_cc_optimized AS optimized_min_cc_optimized,
            cm.optimized_max_cc_optimized AS optimized_max_cc_optimized,
			cm.space_contribution_optimized as space_contribution_optimized,
			hm.age_sellable_sqft_base as age_sellable_sqft_base,
			cm.age_sellable_sqft_optimized as age_sellable_sqft_optimized,
			cm.total_sellable_sqft as total_sellable_sqft_optimized,
			sellable_sqft_optimized/25 as ml_per_parent_block_optimized,
			cm.parent_block  as parent_block_optimized,
			hm.parent_block  as parent_block_base,
			hm.total_sellable_sqft as total_sellable_sqft_base,
			hm.space_contribution_base as space_contribution_base,
            hm.sellable_sqft_base AS sellable_sqft_base,
            hm.sales_base AS sales_base,
			sellable_sqft_base/25 as ml_per_parent_block_base,
            hm.gm_base AS gm_base,
            hm.forecasted_units_base AS forecasted_units_base,
            hm.optimized_min_cc_base AS optimized_min_cc_base,
            hm.optimized_max_cc_base AS optimized_max_cc_base,
            hm.sales_density_base AS sales_density_base,
            hm.gm_density_base AS gm_density_base,
            hm.unit_density_base AS unit_density_base,
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

    SELECT
        json_agg(result)
    FROM (SELECT
            *
        FROM
            final_result ' || _query_table_filters || ') AS result';

    RAISE NOTICE 'query -- %', _query_combine;
    EXECUTE _query_combine INTO result;

    perform global.sp_log(v_gen_random_uuid, 'space_smart.last_optimize_base_age_ct', 'before returning _query_combine', _query_combine, jsonb_build_object('filters',$1 , 'columns_based_on_level',$2, 'max_season',$3, 'store_metric_where_clause',$4, 'store_attribute_filters_where_clause',$5, 'store_last_saved_version_where_clause',$6, 'on_clause',$7, 'temp_table_name',$8, 'current_table_name',$9, 'historical_table_name',$10, 'pc_partition_var',$11, 'prefixed_columns_str',12));


    RETURN result;
END;
$function$
;
