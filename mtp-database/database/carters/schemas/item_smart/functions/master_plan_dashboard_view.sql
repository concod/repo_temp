--liquibase formatted sql
--changeset pundarikaksha.mishra@impactanalytics.co:master_plan_dashboard_view runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:master_plan_dashboard_view-seasons-fix
--comment: master plan: master_plan_dashboard_view-seasons-fix
--rollback: SELECT 1
DROP FUNCTION IF EXISTS item_smart.master_plan_dashboard_view(text, jsonb);


CREATE OR REPLACE FUNCTION item_smart.master_plan_dashboard_view(where_clause text, meta_filter jsonb)
 RETURNS TABLE(master_plan_id integer, hierarchy_filter jsonb, channel text[], start_date timestamp without time zone, end_date timestamp without time zone, edited_by text, approved_by text, status text, latest_status text, comment text, edited_on text, approved_on text, l0_name text[], l2_name text[], l3_name text[], l4_name text[], l5_name text[], collection text[], seasons text[], start_year_month_week text, end_year_month_week text)
 LANGUAGE plpgsql
AS $function$
DECLARE
    final_sql text;
    query_table_filters text := '';
    hierarchy_where text := '';
    hierarchy_filter_param jsonb;
    key_name text;
    json_str text;
BEGIN
    -- Handle meta_filter
    IF meta_filter IS NOT NULL THEN
        query_table_filters := global.form_table_query(meta_filter);
    END IF;

    -- Extract JSONB from where_clause if it contains hierarchy_filter @>
    IF where_clause IS NOT NULL AND where_clause LIKE '%hierarchy_filter @>%' THEN
        -- Extract the JSON string between ' and '::jsonb
        json_str := substring(where_clause from '''(.+)''::jsonb');
        
        IF json_str IS NOT NULL THEN
            hierarchy_filter_param := json_str::jsonb;
            
            -- Build hierarchy filter WHERE clause dynamically with intersection logic
            FOR key_name IN SELECT jsonb_object_keys(hierarchy_filter_param)
            LOOP
                IF hierarchy_where != '' THEN
                    hierarchy_where := hierarchy_where || ' AND ';
                END IF;
                hierarchy_where := hierarchy_where || format(
                    'mpa.hierarchy_filter->%L ?| ARRAY(SELECT jsonb_array_elements_text(%L::jsonb->%L))',
                    key_name,
                    hierarchy_filter_param::text,
                    key_name
                );
            END LOOP;
            
            IF hierarchy_where != '' THEN
                hierarchy_where := 'WHERE ' || hierarchy_where;
            END IF;
        END IF;
    ELSE
        -- No hierarchy_filter in where_clause, use it as-is
        IF where_clause IS NOT NULL AND where_clause != '' THEN
            hierarchy_where := where_clause;
        END IF;
    END IF;

    raise notice 'hierarchy_where: %', hierarchy_where;
    -- Build the final query
    final_sql := format(
        'SELECT * FROM (
            SELECT 
                mpa.master_plan_id,
                mpa.hierarchy_filter,
                mpa.channel::text[] AS channel,
                mpa.start_date::timestamp AS start_date,
                mpa.end_date::timestamp AS end_date,
                um1.user_name::text AS edited_by,
                um2.user_name::text AS approved_by,
                mpl.status::text AS status,
                mps.status::text AS latest_status,
                mpl.comment::text AS comment,
                to_char(mpl.edited_on, ''YYYY-MM-DD HH24:MI:SS'') AS edited_on,
                to_char(mpl.approved_on, ''YYYY-MM-DD HH24:MI:SS'') AS approved_on,
                ARRAY(SELECT jsonb_array_elements_text(mpa.hierarchy_filter->''l0_name''))::text[] AS l0_name,
                ARRAY(SELECT jsonb_array_elements_text(mpa.hierarchy_filter->''l2_name''))::text[] AS l2_name,
                ARRAY(SELECT jsonb_array_elements_text(mpa.hierarchy_filter->''l3_name''))::text[] AS l3_name,
                ARRAY(SELECT jsonb_array_elements_text(mpa.hierarchy_filter->''l4_name''))::text[] AS l4_name,
                ARRAY(SELECT jsonb_array_elements_text(mpa.hierarchy_filter->''l5_name''))::text[] AS l5_name,
                ARRAY(SELECT jsonb_array_elements_text(mpa.hierarchy_filter->''collection''))::text[] AS collection,
                mpa.seasons::text[] AS seasons,
                (SELECT fiscal_year_week::text FROM global.fiscal_date_mapping WHERE calendar_date = mpa.start_date::date LIMIT 1) AS start_year_month_week,
                (SELECT fiscal_year_week::text FROM global.fiscal_date_mapping WHERE calendar_date = mpa.end_date::date LIMIT 1) AS end_year_month_week
            FROM item_smart.master_plan_attributes mpa
            JOIN item_smart.master_plan_status mps ON mpa.master_plan_id = mps.master_plan_attribute_id
            JOIN item_smart.master_plan_ledger mpl ON mpa.master_plan_id = mpl.master_plan_filters_id
            LEFT JOIN "global".user_master um1 ON um1.user_code = mpl.edited_by
            LEFT JOIN "global".user_master um2 ON um2.user_code = mpl.approved_by
            %s
            ORDER BY mpl.edited_on DESC
        ) AS x %s',
        hierarchy_where,
        COALESCE(query_table_filters, '')
    );

    -- Log the query for debugging
    RAISE NOTICE 'Executing query: %', final_sql;

    -- Execute the query
    RETURN QUERY EXECUTE final_sql;
END;
$function$;