--liquibase formatted sql
--changeset paras.jain@impactanalytics.co:MTP-108205_adding_store_Size runOnChange:true stripComments:false splitStatements:false context:added-missing-params labels:liquibase_project_start
--comment: MTP-108205_adding_store_Size
--rollback: SELECT 1


DROP FUNCTION IF Exists space_smart.store_group_last_optimize_base_age_ct(jsonb, text, text, text, text, text, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION space_smart.store_group_last_optimize_base_age_ct(jsonb, max_season text, store_optimized_where_clause text, store_metric_where_clause text, store_attribute_filters_where_clause text, columns_based_on_level text, on_clause text, optimized_columns_based_on_level text, temp_table text, current_table_name text, historical_current_table_name text, pc_partition_var text, pc_partition_var_sellable text)
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
			SELECT store_code,q_str_sls_sqft, master_size as store_size from
				"global".store_attributes_filter
				'|| store_attribute_filters_where_clause || ';
			CREATE INDEX  '|| temp_table ||'_idx ON '|| temp_table ||' USING btree (store_code, q_str_sls_sqft, store_size);


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
(
select
	    sellable_sqft_optimized/25 as ml_per_parent_block_optimized,
	    sellable_sqft_base/25 as ml_per_parent_block_base,
		sum(sellable_sqft_base) over( ' || pc_partition_var_sellable ||' ) as total_sellable_sqft_base,
		sum(sellable_sqft_optimized) over( ' || pc_partition_var_sellable ||' ) as total_sellable_sqft_optimized,
				*
from (
select
            store_size,
			max(last_optimized_level) as last_optimized_level,
			' || optimized_columns_based_on_level || ',
			count(distinct(optimized_result.store_number)) as stores,
		    AVG(sellable_sqft_optimized) as sellable_sqft_optimized,
            AVG(sellable_sqft_base) as sellable_sqft_base,
            AVG(space_contribution_optimized) as space_contribution_optimized,
            AVG(space_contribution_base) as space_contribution_base,
            ROUND(AVG(age_sellable_sqft_base))::int as age_sellable_sqft_base,
            ROUND(AVG(age_sellable_sqft_optimized))::int as age_sellable_sqft_optimized,
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
			0) as total_sq_ft_optimized,
			max(parent_block_optimized) as parent_block_optimized,
			max(parent_block_base) as parent_block_base
			from
(select
					q_str_sls_sqft as total_sq_ft_optimized,
					sellable_sqft_optimized / nullif(sum(sellable_sqft_optimized) over(' || pc_partition_var ||'),0) as space_contribution_optimized,
				    sum(sellable_sqft_optimized) over(' || pc_partition_var || ' ) as age_sellable_sqft_optimized,
                    saf.store_size,
					ct.*
				from
					'|| temp_table ||' saf
				join
                                                                (
					select
						store_number,
						' || columns_based_on_level || ',
						max(last_optimized_level) as last_optimized_level,
                        max(case when season = ''' || max_season || ''' then parent_block else '''' end) as parent_block_optimized,
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
						'|| current_table_name ||' slsv
					' || store_optimized_where_clause || '
					group by
						slsv.store_number,
						' || columns_based_on_level || ')as ct
                                                                            on
					saf.store_code = ct.store_number
				) as optimized_result

					left join


					                                            (
				select
					q_str_sls_sqft as total_sq_ft_base,
					sellable_sqft_base / nullif(sum(sellable_sqft_base) over (' || pc_partition_var ||'),0) as space_contribution_base,
				sum(sellable_sqft_base) over(' || pc_partition_var || ' ) as age_sellable_sqft_base,

					ct.*
				from
					'|| temp_table ||' saf
				join
                                                                (
					select
						' || columns_based_on_level || ',
						store_number,
						max(case when season = ''' || max_season || ''' then parent_block else '''' end) as parent_block_base,
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
						'|| historical_current_table_name ||' sm
					' || store_metric_where_clause || '
					group by
						sm.store_number,
						' || columns_based_on_level || ')as ct
                                                                            on
					saf.store_code = ct.store_number
					) as compare_result

						on
				optimized_result.store_number = compare_result.store_number
				and ' || on_clause || '

			group by 
			' || optimized_columns_based_on_level ||  ', store_size) as current) as p '|| _query_table_filters ||') as result ';

		 -- Apply additional filters
    RAISE NOTICE 'query -- %', _query_combine;

    -- Execute the query and return the cursor
    EXECUTE _query_combine  INTO result;
    RETURN result;

	perform global.sp_log(v_gen_random_uuid, 'space_smart.store_group_last_optimize_base_age_ct', 'after returning _query_combine', _query_combine, jsonb_build_object('input',$1, 'max_season',$2, 'store_optimized_where_clause',$3, 'store_metric_where_clause',$4, 'store_attribute_filters_where_clause',$5, 'columns_based_on_level',$6, 'on_clause',$7, 'optimized_columns_based_on_level',$8, 'temp_table',$9, 'current_table_name',$10, 'historical_current_table_name',$11));

END
$function$
;
