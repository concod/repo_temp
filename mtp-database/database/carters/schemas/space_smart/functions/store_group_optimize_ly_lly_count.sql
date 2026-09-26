--liquibase formatted sql
--changeset paras.jain@impactanalytics.co:MTP-108204_adding_only_required_fields  runOnChange:true stripComments:false splitStatements:false context:MTP-83411-join-to-inner-join labels:liquibase_project_start
--comment: MTP-108204_adding_only_required_fields
--rollback: SELECT 1


DROP FUNCTION IF Exists space_smart.store_group_optimize_ly_lly_count(jsonb, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text);

DROP FUNCTION IF Exists space_smart.store_group_optimize_ly_lly_count(refcursor, jsonb, text, text, text, text, text, text, text, text, text, text);
DROP FUNCTION IF Exists  space_smart.store_group_optimize_ly_lly_count(jsonb, text, text, text, text, text, text, text, text, text, text);
DROP FUNCTION IF Exists space_smart.store_group_optimize_ly_lly_count(jsonb, text, text, text, text, text, text, text, text, text, text, text);


CREATE OR REPLACE FUNCTION space_smart.store_group_optimize_ly_lly_count(filters_json jsonb, max_season text, ly_or_lly_max_season text, columns_based_on_level text, store_optimized_where_clause text, ly_or_lly_past_season_where_clause text, on_clause text, ly_or_lly_future_season_where_clause text, prefixed_columns_str text, store_attribute_filters_where_clause text, compare_with text, temp_table_name text, optimized_table_name text, base_table_name text, actualized_base_table_name text, pc_partition_var text)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare
    _query_table_filters text := '';

_query_combine text;

result JSON;
row_count integer := 0;

begin
_query_table_filters := global.form_table_query($1);

_query_combine :=
        '
create temp table ' || temp_table_name || ' as
			select
	store_code,master_size
from
				"global".store_attributes_filter saf
                 ' || store_attribute_filters_where_clause || ';

create index ' || temp_table_name || '_idx on
' || temp_table_name || '
	using btree (store_code,master_size);

with current_metrics as (
select
	store_number,
	' || columns_based_on_level || ',
    max(case when season = ''' || max_season || ''' then parent_block else '''' end) as parent_block,
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
	' || columns_based_on_level || '
        ),
        historical_metrics as (
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
	' || columns_based_on_level || '
        ),
        secondry as (
select
saf.master_size as store_group,
	cm.store_number as store_number,
	' || prefixed_columns_str || ',
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
	sum(cm.sellable_sqft) over(' || pc_partition_var ||') as age_sellable_sqft_optimized,
	sum(hm.sellable_sqft) over(' || pc_partition_var ||') as age_sellable_sqft_' || compare_with ||',
	cm.sellable_sqft / nullif(sum(cm.sellable_sqft) over(' || pc_partition_var ||'),0) as space_contribution_optimized,
	hm.sellable_sqft / nullif(sum(hm.sellable_sqft) over(' || pc_partition_var ||'),0) as space_contribution_' || compare_with || '
from
	' || temp_table_name || ' saf
join current_metrics cm on
	saf.store_code = cm.store_number
left join historical_metrics hm on
	cm.store_number = hm.store_number
	and ' || on_clause || '
        ),
        p as (
select
                        current.* from
(
select
	' || columns_based_on_level || ',
store_group,
	COUNT(distinct(store_number)) as stores,
	AVG(sellable_sqft_optimized) as sellable_sqft_optimized,
	AVG(sellable_sqft_' || compare_with ||')as sellable_sqft_' || compare_with ||' ,
	AVG(space_contribution_optimized) as space_contribution_optimized,
	AVG(space_contribution_' || compare_with ||') as space_contribution_' || compare_with || ',
	AVG(age_sellable_sqft_optimized) as age_sellable_sqft_optimized,
	AVG(age_sellable_sqft_' || compare_with ||') as age_sellable_sqft_' || compare_with ||',
	SUM(forecasted_units_optimized * forecasted_units_optimized) / nullif(SUM(forecasted_units_optimized),
	0) as forecasted_units_optimized,
	SUM(forecasted_units_' || compare_with || ' * forecasted_units_' || compare_with || ') / nullif(SUM(forecasted_units_' || compare_with || '),
	0) as forecasted_units_' || compare_with || ',
	SUM(optimized_min_cc_optimized * forecasted_units_optimized) / nullif(SUM(forecasted_units_optimized),
	0) as optimized_min_cc_optimized,
	SUM(optimized_min_cc_' || compare_with || ' * forecasted_units_' || compare_with || ') / nullif(SUM(forecasted_units_' || compare_with || '),
	0) as optimized_min_cc_' || compare_with || ',
	SUM(optimized_max_cc_optimized * forecasted_units_optimized) / nullif(SUM(forecasted_units_optimized),
	0) as optimized_max_cc_optimized,
	SUM(optimized_max_cc_' || compare_with || ' * forecasted_units_' || compare_with || ') / nullif(SUM(forecasted_units_' || compare_with || '),
	0) as optimized_max_cc_' || compare_with || ',
	SUM(gm_optimized * forecasted_units_optimized) / nullif(SUM(forecasted_units_optimized),
	0) as gm_optimized,
	SUM(gm_' || compare_with || ' * forecasted_units_' || compare_with || ') / nullif(SUM(forecasted_units_' || compare_with || '),
	0) as gm_' || compare_with || ',
	SUM(sales_optimized * forecasted_units_optimized) / nullif(SUM(forecasted_units_optimized),
	0) as sales_optimized,
	SUM(sales_' || compare_with || ' * forecasted_units_' || compare_with || ') / nullif(SUM(forecasted_units_' || compare_with || '),
	0) as sales_' || compare_with || ',
	max(parent_block_optimized) as parent_block_optimized,
    max(parent_block_' || compare_with ||') as parent_block_' || compare_with ||'
from
	secondry
group by
	' || columns_based_on_level || ', store_group) as current
        )

select
	count(*)
from
	(
	select
		p.*,
		sellable_sqft_optimized/25 as ml_per_parent_block_optimized,
		sellable_sqft_' || compare_with || '/25 as ml_per_parent_block_' || compare_with || ',
		sales_' || compare_with || ' / nullif(sellable_sqft_' || compare_with || ',
		0) as sales_density_' || compare_with || ',
		sales_optimized / nullif(sellable_sqft_optimized,
		0) as sales_density_optimized,
		gm_' || compare_with || ' / nullif(sellable_sqft_' || compare_with || ',
		0) as gm_density_' || compare_with || ',
		gm_optimized / nullif(sellable_sqft_optimized,
		0) as gm_density_optimized,
		forecasted_units_' || compare_with || ' / nullif(sellable_sqft_' || compare_with || ',
		0) as unit_density_' || compare_with || ',
		forecasted_units_optimized / nullif(sellable_sqft_optimized,
		0) as unit_density_optimized
	from
		p ' || _query_table_filters || ') result';

raise notice 'query -- %',
_query_combine;

execute _query_combine
into
	result;
-- Execute the query and return the cursor
return result;
end
$function$
;