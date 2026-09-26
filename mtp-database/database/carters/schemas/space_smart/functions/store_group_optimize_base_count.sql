--liquibase formatted sql
--changeset paras.jain@impactanalytics.co:MTP-108205_adding_store_group runOnChange:true stripComments:false splitStatements:false context:table_name_dynamic labels:liquibase_project_start
--comment: MTP-108205_adding_store_group
--rollback: SELECT 1

DROP FUNCTION IF Exists space_smart.store_group_optimize_base_count(jsonb, text, text, text, text, text, text, text);
DROP FUNCTION IF Exists space_smart.store_group_optimize_base_count(jsonb, text, text, text, text, text, text, text, text);
DROP FUNCTION IF Exists  space_smart.store_group_optimize_base_count(refcursor, jsonb, text, text, text, text, text, text, text);

DROP FUNCTION IF Exists space_smart.store_group_optimize_base_count(jsonb, text, text, text, text, text, text, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION space_smart.store_group_optimize_base_count(filters_json jsonb, max_season text, store_optimized_where_clause text, store_metric_where_clause text, store_attribute_filters_where_clause text, columns_based_on_level text, on_clause text, optimized_columns_based_on_level text, temp_table_name text, cloud_task_id text, optimized_table_name text, base_table_name text, pc_partition_var text)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare
    _query_table_filters text := '';
    _query_combine text;
result JSON;
    row_count integer := 0;

begin
-- Combine the query with proper variable substitution
_query_table_filters := global.form_table_query($1);

_query_combine :=
'
	create temp table ' || temp_table_name || ' as
			select
	store_code,
	q_str_sls_sqft,
master_size as store_size
from
				"global".store_attributes_filter saf
                 ' || store_attribute_filters_where_clause || '
				;

create index ' || temp_table_name || '_idx on
' || temp_table_name || '
	using btree (store_code,
q_str_sls_sqft,
store_size);

select
	count(*)
from
	(
	select
		p.*,

		sales_base / nullif(sellable_sqft_base,
		0) as sales_density_base,
		sales_optimized / nullif(sellable_sqft_optimized,
		0) as sales_density_optimized,
		gm_base / nullif(sellable_sqft_base,
		0) as gm_density_base,
		gm_optimized / nullif(sellable_sqft_optimized,
		0) as gm_density_optimized,
		forecasted_units_base / nullif(sellable_sqft_base,
		0) as unit_density_base,
		forecasted_units_optimized / nullif(sellable_sqft_optimized,
		0) as unit_density_optimized
	from
		(
		select
			sellable_sqft_optimized/25 as ml_per_parent_block_optimized,
	        sellable_sqft_base/25 as ml_per_parent_block_base,
			current.*
		from
			(
			select
				' || optimized_columns_based_on_level || ',
				count(distinct(optimized_result.store_number)) as stores,

				AVG(age_sellable_sqft_optimized) as age_sellable_sqft_optimized,
				AVG(age_sellable_sqft_base) as age_sellable_sqft_base ,
				AVG(sellable_sqft_optimized) as sellable_sqft_optimized,
                AVG(sellable_sqft_base) as sellable_sqft_base,
                AVG(space_contribution_optimized) as space_contribution_optimized,
                AVG(space_contribution_base) as space_contribution_base,

				sum(forecasted_units_optimized * forecasted_units_optimized) / nullif(sum(forecasted_units_optimized),
				0) as forecasted_units_optimized,
				sum(forecasted_units_base * forecasted_units_base) / nullif(sum(forecasted_units_base),
				0) as forecasted_units_base,
				sum(optimized_min_cc_optimized * forecasted_units_optimized )/ nullif(sum(forecasted_units_optimized),
				0) as optimized_min_cc_optimized,
				sum(optimized_min_cc_base * forecasted_units_base )/ nullif(sum(forecasted_units_base),
				0) as optimized_min_cc_base,
				sum(optimized_max_cc_base * forecasted_units_base)/ nullif(sum(forecasted_units_base),
				0) as optimized_max_cc_base,
				sum(optimized_max_cc_optimized * forecasted_units_optimized )/ nullif(sum(forecasted_units_optimized),
				0) as optimized_max_cc_optimized,
				sum(gm_optimized * forecasted_units_optimized)/ nullif(sum(forecasted_units_optimized),
				0) as gm_optimized,
				sum(gm_base * forecasted_units_base)/ nullif(sum(forecasted_units_base),
				0) as gm_base,
				sum(sales_optimized * forecasted_units_optimized)/ nullif(sum(forecasted_units_optimized),
				0) as sales_optimized,
				sum(sales_base * forecasted_units_base)/ nullif(sum(forecasted_units_base),
				0) as sales_base,
				sum(total_sq_ft_base * forecasted_units_base)/ nullif(sum(forecasted_units_base),
				0) as total_sellable_sqft_base,
				sum(total_sq_ft_optimized * forecasted_units_optimized)/ nullif(sum(forecasted_units_optimized),
				0) as total_sellable_sqft_optimized,
			max(parent_block_optimized) as parent_block_optimized,
			max(parent_block_base) as parent_block_base
			from
				(
				select
					q_str_sls_sqft as total_sq_ft_optimized,
					store_size,
					sellable_sqft_optimized / nullif(sum(sellable_sqft_optimized) over(' || pc_partition_var ||'),0) as space_contribution_optimized,
					sum(sellable_sqft_optimized) over(' || pc_partition_var ||') as age_sellable_sqft_optimized,

					ct.*
				from
					' || temp_table_name || ' saf
				join
                                                                (
					select
						store_number,
						' || columns_based_on_level || ',
                        case when cloud_task_id in (''' || cloud_task_id || ''') then 1 else 0 end as cloud_task_id,
						sum(case when season = ''' || max_season || ''' then sellable_sqft else 0 end)as sellable_sqft_optimized,
						sum(sor.sales)/ nullif(sum(case when season = ''' || max_season || ''' then sellable_sqft else 0 end),
						0) as sales_density_optimized,
						sum(sor.sales) as sales_optimized,
						sum(sor.gm) as gm_optimized,
						max(case when season = ''' || max_season || ''' then parent_block else '''' end) as parent_block_optimized,
						sum(sor.gm)/ nullif(sum(case when season = ''' || max_season || ''' then sellable_sqft else 0 end),
						0)as gm_density_optimized,
						sum(forecasted_units) as forecasted_units_optimized,
						sum(forecasted_units)/ nullif(sum(case when season = ''' || max_season || ''' then sellable_sqft else 0 end),
						0) as unit_density_optimized,
						sum(case when season = ''' || max_season || ''' then optimized_min_cc else 0 end) as optimized_min_cc_optimized,
						sum(case when season = ''' || max_season || ''' then optimized_max_cc else 0 end) as optimized_max_cc_optimized
					from
						' || optimized_table_name || ' sor
					' || store_optimized_where_clause || '
					group by
						sor.store_number,cloud_task_id,
						' || columns_based_on_level || ')as ct
                                                                            on
					saf.store_code = ct.store_number WHERE cloud_task_id = 1) as optimized_result
			left join


					                                            (
				select
					q_str_sls_sqft as total_sq_ft_base,
					sellable_sqft_base / nullif(sum(sellable_sqft_base) over(' || pc_partition_var ||'),0) as space_contribution_base,
					sum(sellable_sqft_base) over(' || pc_partition_var ||') as age_sellable_sqft_base,

					ct.*
				from
					' || temp_table_name || ' saf
				join
                                                                (
					select
						' || columns_based_on_level || ',
						store_number,
						sum(case when season = ''' || max_season || ''' then sellable_sqft else 0 end)as sellable_sqft_base,
						sum(sm.sales)/ nullif(sum(case when season = ''' || max_season || ''' then sellable_sqft else 0 end),
						0) as sales_density_base,
						sum(sm.sales) as sales_base,
						max(case when season = ''' || max_season || ''' then parent_block else '''' end) as parent_block_base,
						sum(sm.gm) as gm_base,
						sum(sm.gm)/ nullif(sum(case when season = ''' || max_season || ''' then sellable_sqft else 0 end),
						0)as gm_density_base,
						sum(forecasted_units) as forecasted_units_base,
						sum(forecasted_units)/ nullif(sum(case when season = ''' || max_season || ''' then sellable_sqft else 0 end),
						0) as unit_density_base,
						sum(case when season = ''' || max_season || ''' then optimized_min_cc else 0 end) as optimized_min_cc_base,
						sum(case when season = ''' || max_season || ''' then optimized_max_cc else 0 end) as optimized_max_cc_base
					from
						' || base_table_name || ' sm
					' || store_metric_where_clause || '
					group by
						sm.store_number,
						' || columns_based_on_level || ')as ct
                                                                            on
					saf.store_code = ct.store_number) as compare_result

						on
				optimized_result.store_number = compare_result.store_number
				and ' || on_clause || '
			group by store_size,
				' || optimized_columns_based_on_level || ' ) as current) as p ' || _query_table_filters || ') as result';


    execute _query_combine
into
	result;

return result;
end
$function$
;