--liquibase formatted sql
--changeset paras.jain@impactanalytics.co liquibase:Added_col_names runOnChange:true stripComments:false splitStatements:false context:Changing column reference labels:liquibase_project_start
--comment: MTP-61021 Changing column reference
--rollback: SELECT 1

DROP FUNCTION IF Exists space_smart.store_optimize_base_ly_lly(refcursor, jsonb, text, text, text, text, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION space_smart.store_optimize_base_ly_lly(input refcursor, jsonb, max_season text, store_optimized_where_clause text, store_attribute_filters_where_clause text,
columns_based_on_level text, ly_or_lly_max_season text, ly_or_lly_future_season_where_clause text, ly_or_lly_past_season_where_clause text, on_clause text,
prefixed_columns_str text, compare_with text)
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
    'with current_metrics as (
select
	store_number,
	' || columns_based_on_level || ',
	MAX(case when season = ''' || max_season || ''' then store_parent_block else '''' end) as store_parent_block,
	MAX(case when season = ''' || max_season || ''' then space_elasticity else '''' end) as space_elasticity,
	MAX(case when season = ''' || max_season || ''' then store_group else '''' end) as store_group,
	MAX(case when season =''' || max_season || ''' then status else '''' end) as status,
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
	space_smart.store_optimized_report
                                        ' || store_optimized_where_clause || '
group by
	store_number,
	space_elasticity,
	store_parent_block,
	store_group,
	status,
	' || columns_based_on_level || '
                                    ),
-- Fetch LY and LLY metrics from store_metrics_actualized or store_metrics
historical_metrics as (
select
	store_number,
	' || columns_based_on_level || ',
	SUM(case when season = ''' || ly_or_lly_max_season || ''' then sellable_sqft else 0 end) as sellable_sqft,
	SUM(sales) / nullif(SUM(case when season = ''' || ly_or_lly_max_season || ''' then sellable_sqft else 0 end),
	0) as sales_density,
	SUM(sales) as sales,
	SUM(gm) as gm,
	SUM(gm) / nullif(SUM(case when season = ''' || ly_or_lly_max_season ||''' then sellable_sqft else 0 end),
	0) as gm_density,
	SUM(forecasted_units) as forecasted_units,
	SUM(forecasted_units) / nullif(SUM(case when season = ''' || ly_or_lly_max_season ||''' then sellable_sqft else 0 end),
	0) as unit_density,
	SUM(case when season = ''' || ly_or_lly_max_season ||''' then optimized_min_cc else 0 end) as optimized_min_cc,
	SUM(case when season = ''' || ly_or_lly_max_season ||''' then optimized_max_cc else 0 end) as optimized_max_cc,
	SUM(forecasted_units) / nullif(SUM(sellable_sqft),
	0) as unit_density_ly
from
	(
	select
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
	from
		space_smart.store_metrics_actualized ' || ly_or_lly_past_season_where_clause || '
union all
	select
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
	from
		space_smart.store_metrics ' || ly_or_lly_future_season_where_clause || '
                                            ) as metrics
group by
	store_number,
	' || columns_based_on_level || '
                                    ),
-- Combine current and historical metrics
final_result as (
select
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
	cm.store_number as current_store_number,
	' || prefixed_columns_str || ',
	cm.space_elasticity as space_elasticity,
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
	hm.sellable_sqft as sellable_sqft_' || compare_with ||',
	hm.sales as sales_' || compare_with ||',
	hm.gm as gm_' || compare_with ||',
	hm.forecasted_units as forecasted_units_' || compare_with ||',
	hm.optimized_min_cc as optimized_min_cc_' || compare_with ||',
	hm.optimized_max_cc as optimized_max_cc_' || compare_with ||',
	hm.sales_density as sales_density_'|| compare_with ||',
	hm.gm_density as gm_density_'|| compare_with ||',
	hm.unit_density as unit_density_'|| compare_with ||'
from
	"global".store_attributes_filter saf
join
                                            current_metrics cm
                                        on
	saf.store_code = cm.store_number
left join
                                            historical_metrics hm
                                        on
	cm.store_number = hm.store_number
	and ' || on_clause || '
                                        ' || store_attribute_filters_where_clause || '
                                    )
-- Final selection
                                    select
	*
from
	final_result';
	
-- Apply additional filters
_query_table_filters := global.form_table_query($2);
--RAISE NOTICE 'query -- %', _query_combine || _query_table_filters;

-- Execute the query and return the cursor
OPEN input FOR EXECUTE _query_combine || _query_table_filters;
RETURN input;
END
$function$
;
