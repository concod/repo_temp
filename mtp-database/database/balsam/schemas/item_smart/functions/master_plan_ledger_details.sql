--liquibase formatted sql
--changeset pundarikaksha.mishra@impactanalytics.co:master_plan_ledger_details runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:master_plan_ledger_details
--comment: initial changeset for master_plan_ledger_details
--rollback: SELECT 1
DROP FUNCTION IF EXISTS item_smart.master_plan_ledger_details(int4);

CREATE OR REPLACE FUNCTION item_smart.master_plan_ledger_details(p_master_plan_id integer)
 RETURNS TABLE(status text, date text, username text)
 LANGUAGE plpgsql
AS $function$
DECLARE
    final_sql text;
BEGIN

    -- Build the optimized final query to get unique status records
    final_sql := format(
        'WITH combined_data AS (
            -- Combine edited and approved records
            SELECT 
                COALESCE(mpl.status::text, ''N/A'') AS status,
                GREATEST(
                    COALESCE(mpl.edited_on, ''1900-01-01''::timestamp),
                    COALESCE(mpl.approved_on, ''1900-01-01''::timestamp)
                ) AS max_date,
                CASE 
                    WHEN mpl.approved_on > mpl.edited_on OR (mpl.approved_on IS NOT NULL AND mpl.edited_on IS NULL) THEN
                        COALESCE(um_approved.user_name::text, ''N/A'')
                    ELSE
                        COALESCE(um_edited.user_name::text, ''N/A'')
                END AS username
            FROM item_smart.master_plan_attributes mpa
            JOIN item_smart.master_plan_ledger mpl ON mpa.master_plan_id = mpl.master_plan_filters_id
            LEFT JOIN "global".user_master um_edited ON um_edited.user_code = mpl.edited_by
            LEFT JOIN "global".user_master um_approved ON um_approved.user_code = mpl.approved_by
            WHERE mpa.master_plan_id = %s
        ),
        latest_status AS (
            -- Get the latest record for each status
            SELECT DISTINCT ON (status)
                status,
                max_date,
                username
            FROM combined_data
            ORDER BY status, max_date DESC
        )
        SELECT 
            status,
            to_char(max_date, ''YYYY-MM-DD"T"HH24:MI:SS'') AS date,
            username
        FROM latest_status
        ORDER BY max_date DESC
        ',
        p_master_plan_id
    );

    -- Log the query for debugging
    RAISE NOTICE 'Executing query: %', final_sql;

    -- Execute the query with error handling
    BEGIN
        RETURN QUERY EXECUTE final_sql;

        RAISE NOTICE 'Query executed successfully';
        
    EXCEPTION
        WHEN syntax_error THEN
            RAISE EXCEPTION 'SQL syntax error in generated query: %', SQLERRM;
        WHEN undefined_table THEN
            RAISE EXCEPTION 'Referenced table or column does not exist: %', SQLERRM;
        WHEN undefined_column THEN
            RAISE EXCEPTION 'Referenced column does not exist: %', SQLERRM;
        WHEN others THEN
            RAISE EXCEPTION 'Error executing query: %', SQLERRM;
    END;

EXCEPTION
    WHEN others THEN
        -- Log the error with context
        RAISE NOTICE 'Error in master_plan_ledger_details: %', SQLERRM;
        RAISE EXCEPTION 'Function execution failed: %', SQLERRM;
END;
$function$
;
