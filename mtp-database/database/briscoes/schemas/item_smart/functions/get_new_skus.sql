--liquibase formatted sql
--changeset pundarikaksha.mishra@impactanalytics.co:get_new_skus stripComments:false runOnChange:true splitStatements:false context:item_description_updated labels:itemsmart_initial_commit-4
--comment: initial changeset for get_new_skus-4
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.get_new_skus(where_clause text, meta_filter jsonb);

SET datestyle = 'DMY, ISO';
CREATE OR REPLACE FUNCTION item_smart.get_new_skus(where_clause text, meta_filter jsonb)
 RETURNS TABLE(product_code text, product_name text, product_type text, l0_name text, l1_name text, l2_name text, l3_name text, l4_name text, l5_name text, style_name text, clearance boolean, color text, clearance_date date, price double precision, cost double precision, is_cadence_generated boolean, is_mapped boolean, mapped_product_code_description character varying, mapped_product_code character varying, hierarchy_code integer, launch_date date, exit_date date, product_description text, updated_at timestamp with time zone, sku_status text)
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
                product_code, 
                product_name, 
                product_type,
				l0_name,
				l1_name, 
                l2_name, 
                l3_name, 
                l4_name,
				l5_name,
                style_name, 
                clearance, 
                color, 
                clearance_date::date,
                price,
                cost,  
                is_cadence_generated, 
                is_mapped, 
                mapped_product_code_description,
                mapped_product_code, 
                hierarchy_code,  
                launch_date::date,
				exit_date::date,
				product_description::text,
				COALESCE(updated_at, ''1970-01-01''::timestamptz) AS updated_at,
                CASE 
                    WHEN is_cadence_generated = true AND is_mapped = true THEN ''Copied to WP''
                    WHEN (is_cadence_generated = false OR is_cadence_generated IS NULL) 
                         AND (is_mapped = false OR is_mapped IS NULL) THEN ''Unmapped''
                    WHEN (is_cadence_generated = false OR is_cadence_generated IS NULL) 
                         AND is_mapped = true THEN ''Mapped''
                END as sku_status
            FROM item_smart.new_skus 
            %s product_type in (''NA'',''Hard Kit'', ''Regular'') 
            ORDER BY updated_at DESC
        ) AS x %s',
        CASE 
            WHEN where_clause IS NULL OR where_clause = '' THEN 'where '
            ELSE where_clause || ' AND '
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