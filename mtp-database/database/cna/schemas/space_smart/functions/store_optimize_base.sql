--liquibase formatted sql
--changeset paras.jain@impactanalytics.co liquibase:Added_columns runOnChange:true stripComments:false splitStatements:false context:Changing column reference labels:liquibase_project_start
--comment: MTP-61021 Changing column reference
--rollback: SELECT 1

DROP FUNCTION IF Exists space_smart.store_optimize_base(refcursor, jsonb, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION space_smart.store_optimize_base(input refcursor, jsonb, columns_based_on_level text, max_season text, store_metric_where_clause text, store_attribute_filters_where_clause text, store_optimized_report_where_clause text, on_clause text)
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
	 '
	select
		*
	from
		(
		select
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
			ct.*
		from
			"global".store_attributes_filter saf
		join            
                                                                (
			select
				store_number,
				' || columns_based_on_level || ',
				max(space_elasticity) as space_elasticity,
				sum(case when season = ''' || max_season || ''' then sellable_sqft else 0 end)as sellable_sqft_optimized,
				sum(sor.sales)/ nullif(sum(case when season = ''' || max_season || ''' then sellable_sqft else 0 end),
				0) as sales_density_optimized,
				sum(sor.sales) as sales_optimized,
				sum(sor.gm) as gm_optimized,
				sum(sor.gm)/ nullif(sum(case when season = ''' || max_season || ''' then sellable_sqft else 0 end),
				0)as gm_density_optimized,
				sum(forecasted_units) as forecasted_units_optimized,
				sum(forecasted_units)/ nullif(sum(case when season = ''' || max_season || ''' then sellable_sqft else 0 end),
				0) as unit_density_optimized,
				sum(case when season = ''' || max_season || ''' then optimized_min_cc else 0 end) as optimized_min_cc_optimized,
				sum(case when season = ''' || max_season || ''' then optimized_max_cc else 0 end) as optimized_max_cc_optimized
			from
				space_smart.store_optimized_report sor
                                            ' || store_optimized_report_where_clause || '
			group by
				sor.store_number,
				' || columns_based_on_level || ')as ct
                                                                            on
			saf.store_code = ct.store_number
                                        ' || store_attribute_filters_where_clause || ') as optimized_result
	join
                                                            (
		select
			ct.*
		from
			"global".store_attributes_filter saf
		join            
                                                                (
			select
				store_number as store_code,
                ' || columns_based_on_level || ',
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
AND ' || on_clause || '
';
		 -- Apply additional filters
    _query_table_filters := global.form_table_query($2);
    -- RAISE NOTICE 'query -- %', _query_combine || _query_table_filters;

    -- Execute the query and return the cursor
    OPEN input FOR EXECUTE _query_combine || _query_table_filters;
    RETURN input;
END
$function$
;
