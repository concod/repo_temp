
--liquibase formatted sql
--changeset paras.jain@impactanalytics.co Removing Refcursor and adding jsonb in store_group_last_optimize_base  liquibase:Removing Refcursor and adding jsonb in store_group_last_optimize_base runOnChange:true stripComments:false splitStatements:false context:Removing Refcursor and adding jsonb in store_group_last_optimize_base :liquibase_project_start
--comment: Removing Refcursor and adding jsonb in store_group_last_optimize_base
--rollback: SELECT 1


DROP FUNCTION IF Exists space_smart.store_group_last_optimize_base(jsonb, text, text, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION space_smart.store_group_last_optimize_base(jsonb, max_season text, store_optimized_where_clause text, store_metric_where_clause text, store_attribute_filters_where_clause text, columns_based_on_level text, on_clause text, optimized_columns_based_on_level text, temp_table text)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    _query_table_filters TEXT := '';
    _query_combine TEXT;
    result JSON;
	v_gen_random_uuid text  := gen_random_uuid()::varchar;
BEGIN
    -- Combine the query with proper variable substitution
	 _query_table_filters := global.form_table_query($1);
	 _query_combine :=
'



CREATE TEMP TABLE '|| temp_table ||' as
			SELECT store_code,q_str_sls_sqft from
				"global".store_attributes_filter
				'|| store_attribute_filters_where_clause || ';
			CREATE INDEX  '|| temp_table ||'_idx ON '|| temp_table ||' USING btree (store_code, q_str_sls_sqft);


select json_agg(result) from (select
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
			max(store_group),
			max(last_optimized_level) as last_optimized_level,
			' || optimized_columns_based_on_level || ',
			count(distinct(store_number)) as stores,
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
			sum(optimized_max_cc_optimized * forecasted_units_optimized )/ nullif(sum(forecasted_units_optimized),
			0) as optimized_max_cc_optimized,
			sum(optimized_min_cc_base * forecasted_units_base )/ nullif(sum(forecasted_units_base),
			0) as optimized_min_cc_base,
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
					'|| temp_table ||' saf
				join
                                                                (
					select
						store_number,
						max(case when season = ''' || max_season || ''' then store_group else '''' end )as store_group,
						' || columns_based_on_level || ',
						max(last_optimized_level) as last_optimized_level,
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
						' || columns_based_on_level || ')as ct
                                                                            on
					saf.store_code = ct.store_number
				) as optimized_result

					join


					                                            (
				select
					q_str_sls_sqft as total_sq_ft_base,
					ct.*
				from
					'|| temp_table ||' saf
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
					) as compare_result

						on
				optimized_result.store_number = compare_result.store_code
				and ' || on_clause || '

			group by
			' || optimized_columns_based_on_level || ') as p '|| _query_table_filters ||') as result ';

		 -- Apply additional filters
    RAISE NOTICE 'query -- %', _query_combine || _query_table_filters;

    -- Execute the query and return the cursor
    EXECUTE _query_combine  INTO result;
    RETURN result;

	perform global.sp_log(v_gen_random_uuid, 'space_smart.store_group_last_optimize_base', 'After returning _query_combine', _query_combine, jsonb_build_object('input',$1, 'max_season',$2, 'store_optimized_where_clause',$3, 'store_metric_where_clause',$4, 'store_attribute_filters_where_clause',$5, 'columns_based_on_level',$6, 'on_clause',$7, 'optimized_columns_based_on_level',$8, 'temp_table',$9));

END
$function$
;
