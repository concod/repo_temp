--liquibase formatted sql
--changeset paras.jain@impactanalytics.co:MTP-61021 Adding SP for Store Group  runOnChange:true stripComments:false splitStatements:false context:MTP-61021 Adding SP for Store Group  labels:liquibase_project_start
--comment: MTP-61021 Adding SP Store Group
--rollback: SELECT 1

DROP FUNCTION IF Exists space_smart.store_dashboard_store_space_view_store_group(refcursor, text, text, text, text, jsonb);

CREATE OR REPLACE FUNCTION space_smart.store_dashboard_store_space_view_store_group(input refcursor, max_season text, store_metric_where_clause text, store_attribute_filters_where_clause text, columns_based_on_level text, pagination jsonb)
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
                                left join "global".store_attributes_filter saf on
                                    c.store_number = saf.store_code
                                    ' || store_attribute_filters_where_clause || '
                        ) as ct
                            group by
                                store_group,  ' || columns_based_on_level || ' ) as b';

		 -- Apply additional filters
    _query_table_filters := global.form_table_query($6);

    --RAISE NOTICE 'query -- %', _query_combine || _query_table_filters;

    -- Execute the query and return the cursor
    OPEN input FOR EXECUTE _query_combine || _query_table_filters;
    RETURN input;
END
$function$
;
