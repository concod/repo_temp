--liquibase formatted sql
--changeset kumar.shubham@impactanalytics.co:new_sp_with_temp_table runOnChange:true stripComments:false splitStatements:false context:new_sp_with_temp_table labels:liquibase_project_start
--comment: new_sp_with_temp_table
--rollback: SELECT 1

DROP FUNCTION IF Exists space_smart.store_dashboard_store_space_view_store_group_count(text, text, text, text, text, jsonb);

CREATE OR REPLACE FUNCTION space_smart.store_dashboard_store_space_view_store_group_count(max_season text, store_metric_where_clause text, store_attribute_filters_where_clause text, columns_based_on_level text, temp_table_name text, pagination jsonb)
 returns integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    _query_table_filters TEXT := '';
    _query_combine TEXT;
    row_count integer := 0;
    sql_query TEXT;
    v_gen_random_uuid text  := gen_random_uuid()::varchar;
 BEGIN
    -- Combine the query with proper variable substitution
	 _query_table_filters := global.form_table_query($6);
	
	execute '
	create temp table ' || temp_table_name || ' as 
			select
    store_code,
	q_str_sls_sqft
from
				"global".store_attributes_filter saf
                 ' || store_attribute_filters_where_clause || ';';
                
                
        execute 'create index ' || temp_table_name || '_idx on
' || temp_table_name || '
	using btree (
	store_code,
	q_str_sls_sqft
	);';




	 sql_query := 
	 'select count(*) from (select
                            b.*,
                            sales / nullif(sellable_sqft,0) as sales_density,
                            gm / nullif(sellable_sqft, 0) as gm_density,
                            forecasted_units / nullif(sellable_sqft,0) as unit_density
                        from
                            (
                            select
                                store_group,
                                count(distinct(store_number)) as stores,
                                ' || columns_based_on_level || ',
                                sum(total_sq_ft * forecasted_units)/ nullif(sum(forecasted_units),0) as total_sq_ft,
                                sum(sellable_sqft * forecasted_units)/ nullif(sum(forecasted_units), 0) as sellable_sqft,
                                sum(sales * forecasted_units)/ nullif(sum(forecasted_units), 0) as sales,
                                sum(gm * forecasted_units)/ nullif(sum(forecasted_units), 0) as gm,
                                sum(forecasted_units * forecasted_units) / nullif(sum(forecasted_units),0) as forecasted_units,
                                sum(optimized_min_cc * forecasted_units)/ nullif(sum(forecasted_units),0) as optimized_min_cc,
                                sum(optimized_max_cc * forecasted_units)/ nullif(sum(forecasted_units), 0) as optimized_max_cc
                            from
                                (
                                select
                                    q_str_sls_sqft as total_sq_ft,
                                    c.*
                                from
                                    (
                                    select
                                        max(case when season = ''' || max_season || '''  then store_group else '''' end )as store_group,
                                        store_number,
										' || columns_based_on_level || ',
                                        sum(case when season = ''' || max_season || '''  then sellable_sqft else 0 end)as sellable_sqft,
                                        sum(sales) as sales,
                                        sum(gm) as gm,
                                        sum(forecasted_units) as forecasted_units,
                                        sum(forecasted_units)/ nullif (sum(case when season = ''' || max_season || '''  then sellable_sqft else 0 end),0) as unit_density,
                                        sum(case when season = ''' || max_season || '''  then optimized_min_cc else 0 end) as optimized_min_cc,
                                        sum(case when season = ''' || max_season || '''  then optimized_max_cc else 0 end) as optimized_max_cc
                                    from
                                        space_smart.store_metrics
                                    ' || store_metric_where_clause || '
                                    group by
                                        store_number,  ' || columns_based_on_level || '
                        )as c
                                left join ' || temp_table_name || ' saf on
                                    c.store_number = saf.store_code
                        ) as ct
                            group by
                                 store_group, ' || columns_based_on_level || ' ) as b  ' || _query_table_filters || ' ) result' ;
                       
    perform global.sp_log(v_gen_random_uuid, 'space_smart.store_dashboard_store_space_view_store_group_count', 'before returning sql_query', sql_query, jsonb_build_object('max_season',$1, 'store_metric_where_clause',$2, 'store_attribute_filters_where_clause',$3, 'columns_based_on_level',$4, 'temp_table_name',$5, 'pagination',$6));

    execute sql_query  into row_count;
    return row_count;
end
$function$
;
