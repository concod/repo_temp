--liquibase formatted sql
--changeset paras.jain@impactanalytics.co:MTP-108204_removing_unwanted_sp runOnChange:true stripComments:false splitStatements:false context:MTP-104259_Adding_pb_change_block labels:liquibase_project_start
--comment: MTP-108204_removing_unwanted_sp
--rollback: SELECT 1

DROP FUNCTION IF Exists space_smart.store_optimize_base_ly_lly_count(jsonb, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text);

DROP FUNCTION IF Exists space_smart.store_optimize_base_ly_lly_count(jsonb, text, text, text, text, text, text, text, text, text, text);
DROP FUNCTION IF Exists space_smart.store_optimize_base_ly_lly_count(jsonb, text, text, text, text, text, text, text, text, text, text, text);
DROP FUNCTION IF Exists space_smart.store_optimize_base_ly_lly_count(jsonb, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text);
DROP FUNCTION IF Exists space_smart.store_optimize_base_ly_lly_count(jsonb, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text);
DROP FUNCTION IF Exists space_smart.store_optimize_base_ly_lly_count(refcursor, jsonb, text, text, text, text, text, text, text, text, text, text);


CREATE OR REPLACE FUNCTION space_smart.store_optimize_base_ly_lly_count(jsonb, max_season text, store_optimized_where_clause text, store_attribute_filters_where_clause text, columns_based_on_level text, ly_or_lly_max_season text, ly_or_lly_future_season_where_clause text, ly_or_lly_past_season_where_clause text, on_clause text, prefixed_columns_str text, compare_with text, temp_table_name text, optimized_table_name text, base_table_name text, actualized_base_table_name text, pc_partition_var text, cloud_task_id text, constraint_where_clause text)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
declare
_query_table_filters text := '';

_query_combine text;

result JSON;

begin
	_query_table_filters := global.form_table_query($1);
-- Combine the query with proper variable substitution
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
	rtl_store_category_dsc,
	q_str_grade,
	q_str_sls_sqft,
	sellable_sqft,
master_size as store_size
from
				"global".store_attributes_filter saf
                 ' || store_attribute_filters_where_clause || ';

create index ' || temp_table_name || '_idx on
' || temp_table_name || '
	using btree (
	store_code,
	store_name,
	store_format_rollup,
	store_type,
	volume_cd,
	center_format_type,
	store_format_detail,
	store_format_new,
	rtl_store_category_dsc,
	q_str_grade,
	sellable_sqft,
	q_str_sls_sqft, store_size);


with constraint_data as (
SELECT sca.store_code,sca.l4_name,parent_block_min,parent_block_max,
spb_min.min_sqft::FLOAT/coalesce(nullif(sellable_sqft,0),q_str_sls_sqft)::FLOAT as min_sqft_per,
 spb_max.max_sqft::FLOAT/coalesce(nullif(sellable_sqft,0),q_str_sls_sqft)::FLOAT as max_sqft_per
FROM space_smart.space_constraints_age sca
join ' || temp_table_name || ' tm on sca.store_code = tm.store_code
left join space_smart.space_parent_block spb_min on spb_min.l4_name = sca.l4_name and spb_min.parent_block = sca.parent_block_min
left join space_smart.space_parent_block spb_max on spb_max.l4_name = sca.l4_name and spb_max.parent_block = sca.parent_block_max
'|| constraint_where_clause ||'
),
current_metrics as (
select
				sellable_sqft / nullif(sum(sellable_sqft) over(partition by store_number ' || pc_partition_var || ' ),0) as space_contribution,
				cast(sum(sellable_sqft) over(partition by store_number ' || pc_partition_var || ') as int) as age_sellable_sqft_optimized,
                sum(sellable_sqft) over(partition by store_number ' || pc_partition_var || ' ) as total_sellable_sqft_optimized,
				sellable_sqft/25 as ml_per_parent_block_optimized,
				*
from
	(
	select
		store_number,
		' || columns_based_on_level || ',
        max(case when season = ''' || max_season || ''' then parent_block else '''' end) as parent_block,
        case when cloud_task_id in (''' || cloud_task_id || ''') then 1 else 0 end as cloud_task_id,
		MAX(case when season = ''' || max_season || ''' then store_parent_block else '''' end) as store_parent_block,
        MAX(case when season = ''' || max_season || ''' then space_elasticity else '''' end) as space_elasticity,
		MAX(case when season = ''' || max_season || ''' then store_group else '''' end) as store_group,
		MAX(case when season = ''' || max_season || ''' then status else '''' end) as status,
		SUM(case when season = ''' || max_season || ''' then sellable_sqft else 0 end) as sellable_sqft,
		SUM(sales) / nullif(SUM(case when season = ''' || max_season || ''' then sellable_sqft else 0 end),
		0) as sales_density,
		SUM(sales) as sales,
		SUM(gm) as gm,
		SUM(gm) / nullif(SUM(case when season = ''' || max_season || ''' then sellable_sqft else 0 end),
		0) as gm_density,
		SUM(forecasted_units) as forecasted_units,
		SUM(forecasted_units) / nullif(SUM(case when season = ''' || max_season || ''' then sellable_sqft else 0 end),
		0) as unit_density,
		SUM(case when season = ''' || max_season || ''' then optimized_min_cc else 0 end) as optimized_min_cc,
		SUM(case when season = ''' || max_season || ''' then optimized_max_cc else 0 end) as optimized_max_cc
	from
		' || optimized_table_name || '
                                        ' || store_optimized_where_clause || '
	group by
		store_number,
		store_parent_block,
		store_group,
		status,
        cloud_task_id,
		' || columns_based_on_level || '
                                    )as current WHERE cloud_task_id = 1),
-- Fetch LY and LLY metrics from store_metrics_actualized or store_metrics
historical_metrics as (
select
				sellable_sqft / nullif(sum(sellable_sqft) over(partition by store_number ' || pc_partition_var || ' ),0) as space_contribution,
				cast(sum(sellable_sqft) over(partition by store_number ' || pc_partition_var || ') as int) as age_sellable_sqft,
				sellable_sqft/25 as ml_per_parent_block_' || compare_with || ',
				*
from
	(
	select
		store_number,
		' || columns_based_on_level || ',
		max(case when season = ''' || ly_or_lly_max_season || ''' then parent_block else '''' end) as parent_block,
		SUM(case when season = ''' || ly_or_lly_max_season || ''' then sellable_sqft else 0 end) as sellable_sqft,
		SUM(sales) / nullif(SUM(case when season = ''' || ly_or_lly_max_season || ''' then sellable_sqft else 0 end),
		0) as sales_density,
		SUM(sales) as sales,
		SUM(gm) as gm,
		SUM(gm) / nullif(SUM(case when season = ''' || ly_or_lly_max_season || ''' then sellable_sqft else 0 end),
		0) as gm_density,
		SUM(forecasted_units) as forecasted_units,
		SUM(forecasted_units) / nullif(SUM(case when season = ''' || ly_or_lly_max_season || ''' then sellable_sqft else 0 end),
		0) as unit_density,
		SUM(case when season = ''' || ly_or_lly_max_season || ''' then optimized_min_cc else 0 end) as optimized_min_cc,
		SUM(case when season = ''' || ly_or_lly_max_season || ''' then optimized_max_cc else 0 end) as optimized_max_cc,
		SUM(forecasted_units) / nullif(SUM(sellable_sqft),
		0) as unit_density_ly
	from
		(
		select
			id,
			store_number,
			season,
			' || columns_based_on_level || ',
			parent_block,
			store_parent_block,
			status,
			sales,
			gm,
			forecasted_units,
			optimized_min_cc,
			optimized_max_cc,
			last_optimized,
			last_optimized_by,
			store_group,
			sellable_sqft,
			l0_name,
			l1_name,
			l2_name
		from
			' || actualized_base_table_name || ' ' || ly_or_lly_past_season_where_clause || '
	union all
		select
			id,
			store_number,
			season,
			' || columns_based_on_level || ',
			parent_block,
			store_parent_block,
			status,
			sales,
			gm,
			forecasted_units,
			optimized_min_cc,
			optimized_max_cc,
			last_optimized,
			last_optimized_by,
			store_group,
			sellable_sqft,
			l0_name,
			l1_name,
			l2_name
		from
			' || base_table_name || ' ' || ly_or_lly_future_season_where_clause || '
                                            ) as metrics
	group by
		store_number,
		' || columns_based_on_level || '
                                    ) as current),
-- Combine current and historical metrics
final_result as (
select
	cd.parent_block_max as max_pb_constraint,
	cd.parent_block_min as min_pb_constraint,
	cd.min_sqft_per,
	cd.max_sqft_per,
	saf.store_code as store_number,
	saf.store_name,
saf.store_size,
	saf.store_format_rollup,
	saf.store_type,
	saf.volume_cd,
	saf.store_format_new as center_format_type,
	saf.store_format_detail,
	saf.store_format_new,
	saf.rtl_store_category_dsc,
	saf.q_str_grade,
	saf.q_str_sls_sqft,
	cm.store_number as current_store_number,
	' || prefixed_columns_str || ',
	cm.store_group as store_group,
cm.space_elasticity as space_elasticity,
	cm.sellable_sqft as sellable_sqft_optimized,
	cm.sales_density as sales_density_optimized,
	cm.sales as sales_optimized,
	cm.gm as gm_optimized,
	cm.gm_density as gm_density_optimized,
	cm.forecasted_units as forecasted_units_optimized,
	cm.unit_density as unit_density_optimized,
	cm.optimized_min_cc as optimized_min_cc_optimized,
	cm.optimized_max_cc as optimized_max_cc_optimized,
	cm.parent_block as parent_block_optimized,
	cm.ml_per_parent_block_optimized as ml_per_parent_block_optimized,
	hm.ml_per_parent_block_' || compare_with || ' as ml_per_parent_block_' || compare_with || ',
	hm.parent_block as parent_block_' || compare_with || ',
	hm.sellable_sqft as sellable_sqft_' || compare_with || ',
	hm.sales as sales_' || compare_with || ',
	hm.gm as gm_' || compare_with || ',
	hm.forecasted_units as forecasted_units_' || compare_with || ',
	hm.optimized_min_cc as optimized_min_cc_' || compare_with || ',
	hm.optimized_max_cc as optimized_max_cc_' || compare_with || ',
	hm.sales_density as sales_density_' || compare_with || ',
	hm.gm_density as gm_density_' || compare_with || ',
	hm.unit_density as unit_density_' || compare_with || ',
	cm.space_contribution as space_contribution_optimized,
	hm.space_contribution as space_contribution_' || compare_with || ',
	cm.age_sellable_sqft_optimized as age_sellable_sqft_optimized,
	hm.age_sellable_sqft as age_sellable_sqft_'|| compare_with || ',
    cm.total_sellable_sqft_optimized
from
	' || temp_table_name || ' saf
join
                                            current_metrics cm
                                        on
	saf.store_code = cm.store_number
left join
                                            historical_metrics hm
                                        on
	cm.store_number = hm.store_number
	and ' || on_clause || '
join constraint_data cd on cd.store_code = cm.store_number and cd.l4_name = cm.l4_name
                                    )
-- Final selection
 select
	count(*)
from
	(
	select
		*
	from
		final_result ' || _query_table_filters || ') as result';

raise notice 'query -- %',
_query_combine;

execute _query_combine
into
	result;
-- Execute the query and return the cursor
return result;
end;

$function$
;
