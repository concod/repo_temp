--liquibase formatted sql
--changeset paras.jain@impactanalytics.co liquibase:MTP-108204_removing_unwanted_sp  runOnChange:true stripComments:false splitStatements:false context:MTP-104259_Adding_pb_change_block  reference labels:liquibase_project_start
--comment: MTP-108204_removing_unwanted_sp
--rollback: SELECT 1

DROP FUNCTION IF Exists space_smart.store_optimize_base_count(jsonb, text, text, text, text, text, text, text, text, text, text);
DROP FUNCTION IF Exists space_smart.store_optimize_base_count(jsonb, text, text, text, text, text, text);
DROP FUNCTION IF Exists  space_smart.store_optimize_base_count(jsonb, text, text, text, text, text, text, text);
DROP FUNCTION IF Exists space_smart.store_optimize_base_count(jsonb, text, text, text, text, text, text, text, text);
DROP FUNCTION IF Exists space_smart.store_optimize_base_count(jsonb, text, text, text, text, text, text, text, text, text, text, text);
DROP FUNCTION IF Exists space_smart.store_optimize_base_count(jsonb, text, text, text, text, text, text, text, text, text, text, text, text);
DROP FUNCTION IF Exists space_smart.store_optimize_base_count(refcursor, jsonb, text, text, text, text, text, text);


CREATE OR REPLACE FUNCTION space_smart.store_optimize_base_count(filters_json jsonb, columns_based_on_level text, max_season text, store_metric_where_clause text, store_attribute_filters_where_clause text, store_optimized_report_where_clause text, on_clause text, temp_table_name text, cloud_task_id text, optimized_table_name text, base_table_name text, pc_partition_var text, constraint_where_clause text)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    _query_table_filters text := '';
    _query_combine text;
    row_count integer := 0;
result JSON;
BEGIN
    -- Generate the table filters query
-- Combine the query with proper variable substitution
_query_table_filters := global.form_table_query(filters_json);

_query_combine :=
    '

	create temp table ' || temp_table_name || ' as
			select
    store_code,
	store_name,
	store_format_rollup,
	store_type,
	volume_cd,
	center_format_type,
	store_format_detail,
	store_format_new,
	store_initiative,
	rtl_store_category_dsc,
	q_str_grade,
	q_str_sls_sqft,

master_size as store_size,
sellable_sqft
from
				"global".store_attributes_filter saf
                 ' || store_attribute_filters_where_clause || ';

create index ' || temp_table_name || '_idx on
' || temp_table_name || '
	using btree (
	store_code,
store_initiative,
	store_name,
	store_format_rollup,
	store_type,
	volume_cd,
	center_format_type,
	store_format_detail,
	store_format_new,
	rtl_store_category_dsc,
	q_str_grade,
	q_str_sls_sqft,
store_size,
sellable_sqft
	);

with constraint_data as (
SELECT sca.store_code,sca.l4_name,parent_block_min,parent_block_max,spb_min.min_sqft::FLOAT/coalesce(nullif(sellable_sqft,0),q_str_sls_sqft)::FLOAT as min_sqft_per , spb_max.max_sqft::FLOAT/coalesce(nullif(sellable_sqft,0),q_str_sls_sqft)::FLOAT as max_sqft_per  FROM space_smart.space_constraints_age sca
join ' || temp_table_name || ' tm on sca.store_code = tm.store_code
left join space_smart.space_parent_block spb_min on spb_min.l4_name = sca.l4_name and spb_min.parent_block = sca.parent_block_min
left join space_smart.space_parent_block spb_max on spb_max.l4_name = sca.l4_name and spb_max.parent_block = sca.parent_block_max
'|| constraint_where_clause ||'
)

select
	count(*)
from ( select * from (
	select
parent_block_min as min_pb_constraint,
parent_block_max as max_pb_constraint,
min_sqft_per,
max_sqft_per,
optimized_result.l4_name as default_l4_name,
CASE
WHEN parent_block_optimized IS DISTINCT FROM parent_block_base THEN ''Y''
        ELSE ''N''
END as pb_change_flag,
		*
	from
		(
		select
			saf.store_size,
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
			ct.*
		from
			' || temp_table_name || ' saf
		join (
			select
				sellable_sqft_optimized / sum(sellable_sqft_optimized) over(partition by store_number ' || pc_partition_var || ' ) as space_contribution_optimized,
                sum(sellable_sqft_optimized) over(partition by store_number ' || pc_partition_var || ' ) as total_sellable_sqft_optimized,
				sum(sellable_sqft_optimized) over(partition by store_number ' || pc_partition_var || ' ) as age_sellable_sqft_optimized,

				sellable_sqft_optimized/25 as ml_per_parent_block_optimized,
				*
			from
				(
				select
					store_number,
                    case when cloud_task_id in (''' || cloud_task_id || ''') then 1 else 0 end as cloud_task_id,
					' || columns_based_on_level || ',
					max(case when season = ''' || max_season || ''' then parent_block else '''' end) as parent_block_optimized,
                    MAX(space_elasticity) as space_elasticity,
					SUM(case when season = ''' || max_season || ''' then sellable_sqft else 0 end) as sellable_sqft_optimized,
					SUM(sor.sales) / nullif(SUM(case when season = ''' || max_season || ''' then sellable_sqft else 0 end),
					0) as sales_density_optimized,
					SUM(sor.sales) as sales_optimized,
					SUM(sor.gm) as gm_optimized,
					SUM(sor.gm) / nullif(SUM(case when season = ''' || max_season || ''' then sellable_sqft else 0 end),
					0) as gm_density_optimized,
					SUM(forecasted_units) as forecasted_units_optimized,
					SUM(forecasted_units) / nullif(SUM(case when season = ''' || max_season || ''' then sellable_sqft else 0 end),
					0) as unit_density_optimized,
					SUM(case when season = ''' || max_season || ''' then optimized_min_cc else 0 end) as optimized_min_cc_optimized,
					SUM(case when season = ''' || max_season || ''' then optimized_max_cc else 0 end) as optimized_max_cc_optimized
				from
					' || optimized_table_name || ' sor
                ' || store_optimized_report_where_clause || '
				group by
					sor.store_number,cloud_task_id,
					' || columns_based_on_level || '
            )as current )as ct
            on
			saf.store_code = ct.store_number
            where cloud_task_id = 1
 ) as optimized_result
	join (
		select
			saf.store_code as saf_store_code,
			ct.*
		from
			' || temp_table_name || ' saf
		join (
			select
				sellable_sqft_base / sum(sellable_sqft_base) over(partition by store_code ' || pc_partition_var || ' ) as space_contribution_base,
				sum(sellable_sqft_base) over(partition by store_code ' || pc_partition_var || ' ) as age_sellable_sqft_base,

				sellable_sqft_base/25 as ml_per_parent_block_base,
				*
			from
				(
				select
					store_number as store_code,
					' || columns_based_on_level || ',
                    max(case when season = ''' || max_season || ''' then parent_block else '''' end) as parent_block_base,
					SUM(case when season = ''' || max_season || ''' then sellable_sqft else 0 end) as sellable_sqft_base,
					SUM(sm.sales) / nullif(SUM(case when season = ''' || max_season || ''' then sellable_sqft else 0 end),
					0) as sales_density_base,
					SUM(sm.sales) as sales_base,
					SUM(sm.gm) as gm_base,
					SUM(sm.gm) / nullif(SUM(case when season = ''' || max_season || ''' then sellable_sqft else 0 end),
					0) as gm_density_base,
					SUM(forecasted_units) as forecasted_units_base,
					SUM(forecasted_units) / nullif(SUM(case when season = ''' || max_season || ''' then sellable_sqft else 0 end),
					0) as unit_density_base,
					SUM(case when season = ''' || max_season || ''' then optimized_min_cc else 0 end) as optimized_min_cc_base,
					SUM(case when season = ''' || max_season || ''' then optimized_max_cc else 0 end) as optimized_max_cc_base
				from
					' || base_table_name || ' sm
                    ' || store_metric_where_clause || '
				group by
					sm.store_number,
					' || columns_based_on_level || '
                ) as current ) as ct
                on
			saf.store_code = ct.store_code ) as compare_result
            on
		optimized_result.store_number = compare_result.saf_store_code
		and ' || on_clause || '
		join constraint_data cd on cd.store_code = optimized_result.store_number and cd.l4_name = optimized_result.l4_name
    ) result
' || _query_table_filters || '
) final_result
    ';
-- Apply additional filters

    raise notice 'Query %', _query_combine;

-- Execute the query and store the result in the `result` variable
    execute _query_combine
into
	result;

return result;
END;
$function$
;
