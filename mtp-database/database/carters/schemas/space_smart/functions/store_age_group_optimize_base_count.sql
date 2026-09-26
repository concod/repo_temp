--liquibase formatted sql
--changeset paras.jain@impactanalytics.co:MTP-100269_changing_pagination runOnChange:true stripComments:false splitStatements:false context:MTP-100269_changing_pagination labels:liquibase_project_start
--comment: MTP-100269_changing_pagination
--rollback: SELECT 1


DROP FUNCTION IF Exists  space_smart.store_age_group_optimize_base_count(jsonb, text, text, text, text, text, text, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION space_smart.store_age_group_optimize_base_count(jsonb, max_season text, store_optimized_where_clause text, store_metric_where_clause text, store_attribute_filters_where_clause text, columns_based_on_level text, on_clause text, optimized_columns_based_on_level text, temp_table_name text, optimized_table_name text, base_table_name text, cloud_task_id text, select_clause text)
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
	q_str_sls_sqft,
master_size as store_group
from
				"global".store_attributes_filter saf
                 ' || store_attribute_filters_where_clause || '
				;

create index ' || temp_table_name || '_idx on
' || temp_table_name || '
	using btree (store_code,
q_str_sls_sqft,
store_group);

with base as
	(

			select
				optimized_result.l4_name,
				count(distinct(optimized_result.store_number)) as stores,
				' || select_clause || '
				sum(forecasted_units_base) as forecasted_units_base,

				sum(optimized_min_cc_optimized * forecasted_units_optimized )/ nullif(sum(forecasted_units_optimized),
				0) as optimized_min_cc_optimized,
				sum(optimized_min_cc_base * forecasted_units_base )/ nullif(sum(forecasted_units_base),
				0) as optimized_min_cc_base,
				sum(optimized_max_cc_base * forecasted_units_base)/ nullif(sum(forecasted_units_base),
				0) as optimized_max_cc_base,
				sum(optimized_max_cc_optimized * forecasted_units_optimized )/ nullif(sum(forecasted_units_optimized),
				0) as optimized_max_cc_optimized,

				sum(gm_optimized) as gm_optimized,
				sum(gm_base) as gm_base,
				sum(sales_optimized) as sales_optimized,
				sum(sales_base) as sales_base

			from
				(
				select
					ct.*,
saf.store_group
				from
					' || temp_table_name || ' saf
				join
                                                                (
					select
						store_number,
						l4_name,
                        case when cloud_task_id in (''' || cloud_task_id || ''') then 1 else 0 end as cloud_task_id,

						sum(sor.sales) as sales_optimized,
						sum(sor.gm) as gm_optimized,

						sum(forecasted_units) as forecasted_units_optimized,
						max(case when season = ''' || max_season || ''' then parent_block else '''' end) as parent_block_optimized,

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
					ct.*
				from
					' || temp_table_name || ' saf
				join
                                                                (
					select
						l4_name,
						store_number,
						sum(sm.sales) as sales_base,
						sum(sm.gm) as gm_base,
						sum(forecasted_units) as forecasted_units_base,
						max(case when season = ''' || max_season || ''' then parent_block else '''' end) as parent_block_base,
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
			group by
				' || optimized_columns_based_on_level || ' )  select count(*) from (
				select * from base  ' || _query_table_filters || '  ) as result ';

raise notice 'query -- %', _query_combine;


    execute _query_combine
into
	result;

return result;
end
$function$
;
