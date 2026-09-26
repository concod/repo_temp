--liquibase formatted sql
--changeset paras.jain@impactanalytics.co:Removing cursor and adding index table runOnChange:true stripComments:false splitStatements:false context:Removing cursor and adding index table  labels:liquibase_project_start
--comment: Removing cursor and adding index table
--rollback: SELECT 1


DROP FUNCTION IF Exists space_smart.store_dashboard_store_space_view_store_test(text, text, text, text, jsonb, text);

CREATE OR REPLACE FUNCTION space_smart.store_dashboard_store_space_view_store(max_season text, store_metric_where_clause text, store_attribute_filters_where_clause text, columns_based_on_level text, pagination jsonb, temp_table_name text)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    _query_table_filters TEXT := '';
    _query_combine TEXT;
    _input_json JSON;
    _input_data JSONB;
    _filter_data JSONB;
    _where TEXT;
   result JSON;
   v_gen_random_uuid text  := gen_random_uuid()::varchar;
 begin
	  _query_table_filters := global.form_table_query($5);
    -- Combine the query with proper variable substitution
	 _query_combine :=
	 '

	CREATE TEMP TABLE ' || temp_table_name || ' as
			SELECT store_code,store_name,store_format_rollup,store_type, volume_cd, store_format_new, store_format_detail,
			q_str_sls_sqft, center_format_type, rtl_store_category_dsc,q_str_grade from
				"global".store_attributes_filter saf
			' || store_attribute_filters_where_clause || ';

	CREATE INDEX ' || temp_table_name || '_idx ON ' || temp_table_name || ' USING btree (store_code,store_name,store_format_rollup,store_type, volume_cd,center_format_type, store_format_detail,
			q_str_sls_sqft, store_format_new, rtl_store_category_dsc,q_str_grade);


select
	json_agg(result)
from (select * from (
select
                            saf.store_code ,
                            saf.store_name ,
                            saf.store_format_rollup,
                            saf.store_format_new as store_format,
                            saf.store_type ,
                            saf.volume_cd ,
                            saf.store_format_new as center_format_type,
                            saf.rtl_store_category_dsc ,
                            saf.q_str_grade ,
                            saf.q_str_sls_sqft,
                            saf.store_format_detail,
                            ct.*
                        from
                           ' || temp_table_name || ' saf
                        join
                                            (
                            select
                                * ,
                                unit_density / nullif(AVG(unit_density)over(partition by store_group,  ' || columns_based_on_level ||' ),0) as unit_density_index,
                                sales_density / nullif(AVG(sales_density)
                                            over (partition by store_group, ' || columns_based_on_level ||' ),0) as sales_density_index
                            from
                                (
                                select
                                    store_number,
									' || columns_based_on_level ||',
                                    max(case WHEN season = ''' || max_season || ''' then space_elasticity else '''' end) AS space_elasticity,
                                    max(case when season= ''' || max_season || ''' then sm.store_parent_block else '''' end )as store_parent_block,
                                    max(case when season= ''' || max_season || ''' then sm.parent_block else '''' end )as pb_size,
                                    max(case when season= ''' || max_season || ''' then sm.store_group else '''' end )as store_group,
                                    max(case when season= ''' || max_season || ''' then sm.status else '''' end) as status,
                                    sum(case when season = ''' || max_season || ''' then sellable_sqft else 0 end)as sellable_sqft,
                                    sum(sm.sales)/ nullif(sum(case when season = ''' || max_season || ''' then sellable_sqft else 0 end),0) as sales_density,
                                    sum(sm.gm) as gm,
                                    sum(sm.sales) as sales,
                                    sum(sm.gm)/ nullif(sum(case when season = ''' || max_season || ''' then sellable_sqft else 0 end),0)as gm_density,
                                    sum(forecasted_units) as forecasted_units,
                                    sum(forecasted_units)/ nullif(sum(case when season = ''' || max_season || ''' then sellable_sqft else 0 end),0) as unit_density,
                                    sum(case when season= ''' || max_season || ''' then optimized_min_cc else 0 end) as optimized_min_cc,
                                    sum(case when season= ''' || max_season || ''' then optimized_max_cc else 0 end) as optimized_max_cc,
                                    avg(ml_per_parent_block) as ml_per_parent_block
                                from
                                    space_smart.store_metrics sm
								' || store_metric_where_clause || '
                                group by
                                    sm.store_number,
								' || columns_based_on_level ||'
								)as c) as ct
                                            on
                            saf.store_code = ct.store_number
                              ) as p ' || _query_table_filters || ') as result';

		 -- Apply additional filters

    RAISE NOTICE 'query -- %', _query_combine || _query_table_filters;
   execute _query_combine
into
	result;

perform global.sp_log(v_gen_random_uuid, 'space_smart.store_dashboard_store_space_view_store', 'before returning _query_combine', _query_combine, jsonb_build_object('max_season',$1, 'store_metric_where_clause',$2, 'store_attribute_filters_where_clause',$3, 'columns_based_on_level',$4, 'pagination',$5, 'temp_table_name',$6));


return result;
END
$function$
;
