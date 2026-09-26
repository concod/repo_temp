--liquibase formatted sql
--changeset paras.jain@impactanalytics.co:MTP-1041222_making_it_compatible runOnChange:true stripComments:false splitStatements:false context:MTP-1041222_making_it_compatible labels:liquibase_project_start
--comment: MTP-1041222_making_it_compatible
--rollback: SELECT 1

DROP FUNCTION IF Exists space_smart.store_age_group_last_optimize_ly_lly(jsonb, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION space_smart.store_age_group_last_optimize_ly_lly(jsonb, max_season text, ly_or_lly_max_season text, store_optimized_where_clause text, ly_or_lly_past_season_where_clause text, on_clause text, ly_or_lly_future_season_where_clause text, prefixed_columns_str text, store_attribute_filters_where_clause text, compare_with text, temp_table_name text, optimized_table_name text, base_table_name text, actualized_base_table_name text, group_by text, select_clause text)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
declare
    _query_table_filters text := '';

_query_combine text;

result JSON;

begin
-- Combine the query with proper variable substitution
_query_table_filters := global.form_table_query($1);

_query_combine :=
        '
create temp table ' || temp_table_name || ' as
			select
	store_code,
master_size as store_group
from
				"global".store_attributes_filter saf
                 ' || store_attribute_filters_where_clause || ';

create index ' || temp_table_name || '_idx on
' || temp_table_name || '
	using btree (store_code, store_group);

with current_metrics as (
select
	store_number,
	l4_name,
	SUM(sales) as sales,
	SUM(gm) as gm,
	SUM(forecasted_units) as forecasted_units,
	max(case when season = ''' || max_season || ''' then parent_block else '''' end) as parent_block,

	SUM(case when season = ''' || max_season || ''' then optimized_min_cc else 0 end) as optimized_min_cc,
	SUM(case when season = ''' || max_season || ''' then optimized_max_cc else 0 end) as optimized_max_cc
from
	' || optimized_table_name || '
                ' || store_optimized_where_clause || '
group by
	store_number,
	l4_name
        ),
        historical_metrics as (
select
	store_number,
	l4_name,
	SUM(sales) as sales,
	max(case when season = ''' || ly_or_lly_max_season || ''' then parent_block else '''' end) as parent_block,
	SUM(gm) as gm,
	SUM(gm) / nullif(SUM(case when season = ''' || ly_or_lly_max_season || ''' then sellable_sqft else 0 end),
	0) as gm_density,
	SUM(forecasted_units) as forecasted_units,
	SUM(case when season = ''' || ly_or_lly_max_season || ''' then optimized_min_cc else 0 end) as optimized_min_cc,
	SUM(case when season = ''' || ly_or_lly_max_season || ''' then optimized_max_cc else 0 end) as optimized_max_cc
from
	(
	select
				id,
		store_number,
		season,
		l4_name,
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
		sellable_sqft,
		l0_name,
		l1_name,
		l2_name
	from
		' || actualized_base_table_name || '
                    ' || ly_or_lly_past_season_where_clause || '
union all
	select
				id,
		store_number,
		season,
		l4_name,
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
		sellable_sqft,
		l0_name,
		l1_name,
		l2_name
	from
		' || base_table_name || '
                    ' || ly_or_lly_future_season_where_clause || '
                ) as metrics
group by
	store_number,
	l4_name
        ),
        secondry as (
select
	cm.store_number as store_number,
cm.parent_block as parent_block_optimized,
saf.store_group,
	cm.l4_name,
	cm.sales as sales_optimized,
	cm.gm as gm_optimized,
	cm.forecasted_units as forecasted_units_optimized,
	cm.optimized_min_cc as optimized_min_cc_optimized,
	cm.optimized_max_cc as optimized_max_cc_optimized,
	hm.sales as sales_' || compare_with || ',
	hm.gm as gm_' || compare_with || ',
	hm.forecasted_units as forecasted_units_' || compare_with || ',
	hm.optimized_min_cc as optimized_min_cc_' || compare_with || ',
	hm.optimized_max_cc as optimized_max_cc_' || compare_with || '
from
	' || temp_table_name || ' saf
join current_metrics cm on
	saf.store_code = cm.store_number
left join historical_metrics hm on
	cm.store_number = hm.store_number
	and ' || on_clause || '
        )

select
	json_agg(result)
from
(
select * from
	(
select
	l4_name,
	COUNT(distinct(store_number)) as stores,
	' || select_clause || '
	SUM(forecasted_units_' || compare_with || ') as forecasted_units_' || compare_with || ',

	SUM(optimized_min_cc_optimized * forecasted_units_optimized) / nullif(SUM(forecasted_units_optimized),
	0) as optimized_min_cc_optimized,
	SUM(optimized_min_cc_' || compare_with || ' * forecasted_units_' || compare_with || ') / nullif(SUM(forecasted_units_' || compare_with || '),
	0) as optimized_min_cc_' || compare_with || ',
	SUM(optimized_max_cc_optimized * forecasted_units_optimized) / nullif(SUM(forecasted_units_optimized),
	0) as optimized_max_cc_optimized,
	SUM(optimized_max_cc_' || compare_with || ' * forecasted_units_' || compare_with || ') / nullif(SUM(forecasted_units_' || compare_with || '),
	0) as optimized_max_cc_' || compare_with || ',

	SUM(gm_optimized) as gm_optimized,
	SUM(gm_' || compare_with || ') as gm_' || compare_with || ',
	SUM(sales_optimized ) as sales_optimized,
	SUM(sales_' || compare_with || ') as sales_' || compare_with || '

from
	secondry
group by
	' || group_by || '  ) outer_query '|| _query_table_filters || ' ) result  ';

raise notice 'query -- %', _query_combine;

execute _query_combine
into
	result;
-- Execute the query and return the cursor
return result;
end
$function$
;
