--liquibase formatted sql
--changeset pundarikaksha.mishra@impactanalytics.co:get_new_skus runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:get_new_skus-2
--comment: initial changeset for get_new_skus-2
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.get_new_skus(text, jsonb);

CREATE OR REPLACE FUNCTION item_smart.get_new_skus(where_clause text, meta_filter jsonb)
 RETURNS TABLE(style text, style_status text, style_description text, l0_name text, l1_name text, l2_name text, l3_name text, l4_name text, l5_name text, launch_date date, exit_date date, mapped_product_code character varying, mapped_product_code_description character varying, updated_at timestamp with time zone, product_type character varying, sleeve_length_dsc text, sleeve_type text, leg_type text, leg_length_dsc text, cost double precision, price double precision, size text, active boolean)
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
        'SELECT 
            style,
            CASE
                WHEN is_cadence_generated = true AND is_mapped = true THEN ''Copied to WP''
                WHEN (is_cadence_generated = false OR is_cadence_generated IS NULL)
                    AND (is_mapped = false OR is_mapped IS NULL) THEN ''Unmapped''
                WHEN (is_cadence_generated = false OR is_cadence_generated IS NULL)
                    AND is_mapped = true THEN ''Mapped''
                ELSE ''Unknown''
            END as style_status,
            style_description,
            l0_name,
            l1_name,
            l2_name,
            l3_name,
            l4_name,
            l5_name,
            launch_date,
            exit_date,
            mapped_product_code,
            mapped_product_code_description,
            updated_at,
            product_type,
			sleeve_length_dsc,
            sleeve_type,
            leg_type,
            leg_length_dsc,
            cost,
            price,
            size,
            active

        FROM item_smart.new_skus
        %s
        ORDER BY updated_at DESC
        %s',
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
