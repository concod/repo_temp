--liquibase formatted sql
--changeset pundarikaksha.mishra@impactanalytics.co:insert_master_plan_with_output runOnChange:true stripComments:false splitStatements:false context:Release_tz labels:insert_master_plan_with_customised-1
--comment: changes for insert_master_plan_with_customised-1
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.master_plan_dashboard_view(where_clause text, meta_filter jsonb);
CREATE OR REPLACE FUNCTION item_smart.master_plan_dashboard_view(where_clause text, meta_filter jsonb)
 RETURNS TABLE(master_plan_id integer, hierarchy_filter jsonb, channel text[], sub_channel text[], start_date timestamp without time zone, end_date timestamp without time zone, edited_by text, approved_by text, status text, latest_status text, comment text, edited_on text, approved_on text, l0_name text, l1_name text)
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

    -- Build the final query
    final_sql := format(
        'SELECT * FROM (
            SELECT 
                mpa.master_plan_id,
                mpa.hierarchy_filter,
                mpa.channel::text[] AS channel,
				mpa.sub_channel::text[] AS sub_channel,
                mpa.start_date::timestamp AS start_date,
                mpa.end_date::timestamp AS end_date,
                um1.user_name::text AS edited_by,
                um2.user_name::text AS approved_by,
                mpl.status::text AS status,
                mps.status::text AS latest_status,
                mpl.comment::text AS comment,
                to_char(mpl.edited_on, ''YYYY-MM-DD HH24:MI:SS'') AS edited_on,
                to_char(mpl.approved_on, ''YYYY-MM-DD HH24:MI:SS'') AS approved_on,
                mpa.hierarchy_filter->''l0_name''->>0 AS l0_name,
				mpa.hierarchy_filter->''l1_name''->>0 AS l1_name
            FROM item_smart.master_plan_attributes mpa
            JOIN item_smart.master_plan_status mps ON mpa.master_plan_id = mps.master_plan_attribute_id
            JOIN item_smart.master_plan_ledger mpl ON mpa.master_plan_id = mpl.master_plan_filters_id
            LEFT JOIN "global".user_master um1 ON um1.user_code = mpl.edited_by
            LEFT JOIN "global".user_master um2 ON um2.user_code = mpl.approved_by
            %s
            ORDER BY mpl.edited_on DESC
        ) AS x %s',
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