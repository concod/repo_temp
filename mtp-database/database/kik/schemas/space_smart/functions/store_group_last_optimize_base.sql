
--liquibase formatted sql
--changeset paras.jain@impactanalytics.co liquibase:store group table adding missing col runOnChange:true stripComments:false splitStatements:false context:Adding missing col :liquibase_project_start
--comment: Adding missing column
--rollback: SELECT 1

DROP FUNCTION IF Exists space_smart.store_group_last_optimize_base(refcursor, jsonb, text, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION space_smart.store_group_last_optimize_base(input refcursor, jsonb, max_season text, store_optimized_where_clause text, store_metric_where_clause text, store_attribute_filters_where_clause text, columns_based_on_level text, on_clause text, optimized_columns_based_on_level text)
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
'select
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
(select
			store_group,
			' || optimized_columns_based_on_level || ',
			count(distinct(store_number)) as stores,
			max(last_optimized_level) as last_optimized_level,
			SUM(sellable_sqft_optimized * forecasted_units_optimized)/ nullif(SUM(forecasted_units_optimized),
			0) as sellable_sqft_optimized,
			SUM(sellable_sqft_base * forecasted_units_base)/ nullif(SUM(forecasted_units_base),
			0) as sellable_sqft_base,
			sum(forecasted_units_optimized * forecasted_units_optimized) / nullif(sum(forecasted_units_optimized),
			0) as forecasted_units_optimized,
			sum(forecasted_units_base * forecasted_units_base) / nullif(sum(forecasted_units_base),
			0) as forecasted_units_base,
			sum(optimized_min_cc_optimized * forecasted_units_optimized )/ nullif(sum(forecasted_units_optimized),
			0) as optimized_min_cc_optimized,
			sum(optimized_min_cc_base * forecasted_units_base )/ nullif(sum(forecasted_units_base),
			0) as optimized_min_cc_base,
			sum(optimized_max_cc_optimized * forecasted_units_optimized )/ nullif(sum(forecasted_units_optimized),
			0) as optimized_max_cc_optimized,
			sum(optimized_max_cc_base * forecasted_units_base )/ nullif(sum(forecasted_units_base),
			0) as optimized_max_cc_base,
			sum(gm_optimized * forecasted_units_optimized)/ nullif(sum(forecasted_units_optimized),
			0) as gm_optimized,
			sum(gm_base * forecasted_units_base)/ nullif(sum(forecasted_units_base),
			0) as gm_base,
			sum(sales_optimized * forecasted_units_optimized)/ nullif(sum(forecasted_units_optimized),
			0) as sales_optimized,
			sum(sales_base * forecasted_units_base)/ nullif(sum(forecasted_units_base),
			0) as sales_base,
			sum(total_sq_ft_base * forecasted_units_base)/ nullif(sum(forecasted_units_base),
			0) as total_sq_ft_base,
			sum(total_sq_ft_optimized * forecasted_units_optimized)/ nullif(sum(forecasted_units_optimized),
			0) as total_sq_ft_optimized
			from
(select
					q_str_sls_sqft as total_sq_ft_optimized,
					ct.*
				from
					"global".store_attributes_filter saf
				join
                                                                (
					select
						store_number,
						max(last_optimized_level) as last_optimized_level,
						max(case when season = ''' || max_season || ''' then store_group else '''' end )as store_group,
						' || columns_based_on_level || ',
						sum(case when season = ''' || max_season || ''' then sellable_sqft else 0 end)as sellable_sqft_optimized,
						sum(slsv.sales)/ nullif(sum(case when season = ''' || max_season || ''' then sellable_sqft else 0 end),
						0) as sales_density_optimized,
						sum(slsv.sales) as sales_optimized,
						sum(slsv.gm) as gm_optimized,
						sum(slsv.gm)/ nullif(sum(case when season = ''' || max_season || ''' then sellable_sqft else 0 end),
						0)as gm_density_optimized,
						sum(forecasted_units) as forecasted_units_optimized,
						sum(forecasted_units)/ nullif(sum(case when season = ''' || max_season || ''' then sellable_sqft else 0 end),
						0) as unit_density_optimized,
						sum(case when season = ''' || max_season || ''' then optimized_min_cc else 0 end) as optimized_min_cc_optimized,
						sum(case when season = ''' || max_season || ''' then optimized_max_cc else 0 end) as optimized_max_cc_optimized
					from
						space_smart.store_last_saved_version slsv
					' || store_optimized_where_clause || '
					group by
						slsv.store_number,
						store_group,
						' || columns_based_on_level || ')as ct
                                                                            on
					saf.store_code = ct.store_number
				' || store_attribute_filters_where_clause || ') as optimized_result

					join


					                                            (
				select
					q_str_sls_sqft as total_sq_ft_base,
					ct.*
				from
					"global".store_attributes_filter saf
				join
                                                                (
					select
						' || columns_based_on_level || ',
						store_number as store_code,
						sum(case when season = ''' || max_season || ''' then sellable_sqft else 0 end)as sellable_sqft_base,
						sum(sm.sales)/ nullif(sum(case when season = ''' || max_season || ''' then sellable_sqft else 0 end),
						0) as sales_density_base,
						sum(sm.sales) as sales_base,
						sum(sm.gm) as gm_base,
						sum(sm.gm)/ nullif(sum(case when season = ''' || max_season || ''' then sellable_sqft else 0 end),
						0)as gm_density_base,
						sum(forecasted_units) as forecasted_units_base,
						sum(forecasted_units)/ nullif(sum(case when season = ''' || max_season || ''' then sellable_sqft else 0 end),
						0) as unit_density_base,
						sum(case when season = ''' || max_season || ''' then optimized_min_cc else 0 end) as optimized_min_cc_base,
						sum(case when season = ''' || max_season || ''' then optimized_max_cc else 0 end) as optimized_max_cc_base
					from
						space_smart.store_metrics sm
					' || store_metric_where_clause || '
					group by
						sm.store_number,
						' || columns_based_on_level || ')as ct
                                                                            on
					saf.store_code = ct.store_code
					' || store_attribute_filters_where_clause || ') as compare_result

						on
				optimized_result.store_number = compare_result.store_code
				and ' || on_clause || '

			group by
			store_group,
			' || optimized_columns_based_on_level || ') as p ';

		 -- Apply additional filters
    _query_table_filters := global.form_table_query($2);
    RAISE NOTICE 'query -- %', _query_combine || _query_table_filters;

    -- Execute the query and return the cursor
    OPEN input FOR EXECUTE _query_combine || _query_table_filters;
    RETURN input;
END
$function$
;
