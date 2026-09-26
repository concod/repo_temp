--liquibase formatted sql
--changeset paras.jain@impactanalytics.co Removing refcursor liquibase:Removing refcursor runOnChange:true stripComments:false splitStatements:false context: Removing refcursor labels:liquibase_project_start
--comment: Removing refcursor
--rollback: SELECT 1


DROP FUNCTION IF EXISTS space_smart.last_optimize_base(jsonb, text, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION space_smart.last_optimize_base(jsonb, columns_based_on_level text, max_season text, store_metric_where_clause text, store_attribute_filters_where_clause text, store_last_saved_version_where_clause text, on_clause text, temp_table_name text)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    _query_table_filters TEXT := '';
    _query_combine TEXT;
   result JSON;
   v_gen_random_uuid text  := gen_random_uuid()::varchar;
 begin
	     _query_table_filters := global.form_table_query($1);

    -- Combine the query with proper variable substitution
	 _query_combine :=
	 '
CREATE TEMP TABLE ' || temp_table_name || ' as SELECT store_name,store_format_rollup,store_type,volume_cd,center_format_type,store_format_detail, store_format_new,
			rtl_store_category_dsc, q_str_grade, q_str_sls_sqft,store_code from "global".store_attributes_filter saf
			' || store_attribute_filters_where_clause || ';

			CREATE INDEX ' || temp_table_name || '_idx ON ' || temp_table_name || ' USING btree (store_name,store_format_rollup,store_type,volume_cd,center_format_type,store_format_detail, store_format_new,
			rtl_store_category_dsc, q_str_grade, q_str_sls_sqft,store_code);


select json_agg(result) from
	( select
		*
	from
		(
		select
			ct.*
		from
			 ' || temp_table_name || ' saf
		join
                                                                (
			select
				store_number,
				' || columns_based_on_level || ',
				max(space_elasticity) as space_elasticity,
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
                                            ' || store_last_saved_version_where_clause || '
			group by
				slsv.store_number,
				' || columns_based_on_level || ')as ct
                                                                            on
			saf.store_code = ct.store_number
                                        ) as optimized_result
	join
                                                            (
		select
			ct.*
		from
			' || temp_table_name || ' saf
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
                                        ) as compare_result
                                                            on
		optimized_result.store_number = compare_result.store_code
AND ' || on_clause || ' ' || _query_table_filters ||') result
';
		 -- Apply additional filters
    RAISE NOTICE 'query -- %', _query_combine || _query_table_filters;

    execute _query_combine
into
	result;

perform global.sp_log(v_gen_random_uuid, 'space_smart.last_optimize_base', 'before returning _query_combine', _query_combine, jsonb_build_object('input',$1, 'columns_based_on_level',$2, 'max_season',$3, 'store_metric_where_clause',$4, 'store_attribute_filters_where_clause',$5, 'store_last_saved_version_where_clause',$6, 'on_clause',$7, 'temp_table_name',$8));

return result;
END
$function$
;
