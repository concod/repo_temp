--liquibase formatted sql
--changeset pundarikaksha.mishra@impactanalytics.co:master_plan_dashboard_view runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:master_plan_dashboard_view
--comment: initial changeset for master_plan_dashboard_view
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.master_plan_dashboard_view(where_clause text, meta_filter jsonb);

CREATE OR REPLACE FUNCTION item_smart.master_plan_dashboard_view(where_clause text, meta_filter jsonb)
 RETURNS TABLE(
 master_plan_id integer, 
 hierarchy_filter jsonb, 
 channel text[], 
 sub_channel text[], 
 start_date timestamp without time zone, 
 end_date timestamp without time zone, 
 wp_sales_unit numeric, 
 wp_revenue numeric, 
 wp_margin numeric, 
 edited_by text, 
 approved_by text, 
 status text, 
 latest_status text, 
 comment text, 
 edited_on text, 
 approved_on text,
 created_on text,
 l0_name text, 
 l1_name text, 
 selected_item_count integer, 
 total_item_count integer,  
 sku_list text[]
 )
 LANGUAGE plpgsql
AS $function$
DECLARE
    final_sql text;
    query_table_filters text := '';
BEGIN
    -- Handle meta_filter
    IF meta_filter IS NOT NULL THEN
        query_table_filters := global.form_table_query(meta_filter);
    END IF;

	raise notice 'query_table_filters: %', query_table_filters;

	query_table_filters := regexp_replace(
	    query_table_filters,
	    $$\(\s*sub_channel::text\s*ILIKE\s*'%-%'\s*\)$$, -- The regular expression pattern
	    '(sub_channel IS NULL)',       -- The replacement string
	    'g'
	);

	raise notice 'query_table_filters: %', query_table_filters;

    -- Build the final query
    final_sql := format(
		$func$
        SELECT * FROM (
            SELECT 
                mpa.master_plan_id::integer,
	            mpa.hierarchy_filter::jsonb,
	            mpa.channel::text[],
	            mpa.sub_channel::text[],
	            mpa.start_date::timestamp,
	            mpa.end_date::timestamp,
	            mpa.wp_sales_units::numeric as wp_sales_unit,
	            mpa.wp_revenue::numeric,
	            mpa.wp_margin::numeric,
				COALESCE(um1.user_name, '')::text AS edited_by,
	            COALESCE(um2.user_name, '')::text AS approved_by,
	            COALESCE(mps.status, '')::text AS status,
	            COALESCE(mps.status, '')::text AS latest_status,
	            COALESCE(mps.comment, '')::text AS comment,
	            COALESCE(to_char(mps.edited_on, 'YYYY-MM-DD HH24:MI:SS'), '')::text AS edited_on,
            	COALESCE(to_char(mps.approved_on, 'YYYY-MM-DD HH24:MI:SS'), '')::text AS approved_on,
				COALESCE(to_char(mps.created_on, 'YYYY-MM-DD HH24:MI:SS'), '')::text AS created_on,
                COALESCE(mpa.hierarchy_filter->'l0_name'->>0 ,'') AS l0_name,
				COALESCE(mpa.hierarchy_filter->'l1_name'->>0 ,'') AS l1_name,
				COALESCE(mpaac.count, 0)::integer AS selected_item_count,
				COALESCE(mpa.total_item_count, 0)::integer AS total_item_count,
				COALESCE(mpa.sku_list, ARRAY[]::text[])::text[] AS sku_list
            FROM item_smart.master_plan_attributes mpa
            JOIN item_smart.master_plan_status mps ON mpa.master_plan_id = mps.master_plan_attribute_id
	        JOIN item_smart.master_plan_action_counts mpaac ON mpa.master_plan_id = mpaac.mpa_plan_id
	        LEFT JOIN global.user_master um1 ON um1.user_code = mps.edited_by
	        LEFT JOIN global.user_master um2 ON um2.user_code = mps.approved_by
            %s
            ORDER BY GREATEST(
            COALESCE(mps.created_on, '1900-01-01'::timestamp),
            COALESCE(mps.edited_on, '1900-01-01'::timestamp),
            COALESCE(mps.approved_on, '1900-01-01'::timestamp)
        	) DESC
        ) AS x %s
		$func$,
        CASE 
            WHEN where_clause IS NULL OR where_clause = '' THEN ''
            ELSE where_clause
        END,
        COALESCE(query_table_filters, '')
    );

    -- Log the query for debugging
    RAISE NOTICE 'Executing query: %', final_sql;

    -- Execute the query
    RETURN QUERY EXECUTE final_sql;
END;
$function$
;