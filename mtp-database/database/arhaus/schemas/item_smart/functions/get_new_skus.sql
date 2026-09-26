--liquibase formatted sql
--changeset pundarikaksha.mishra@impactanalytics.co:get_new_skus stripComments:false runOnChange:true splitStatements:false context:query_updated labels:itemsmart_initial_commit_1
--comment: initial changeset for get_new_skus_1
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.get_new_skus(where_clause text, meta_filter jsonb);
CREATE OR REPLACE FUNCTION item_smart.get_new_skus(where_clause text, meta_filter jsonb)
 RETURNS TABLE(product_code character varying, product_name character varying, product_type character varying, l2_name character varying, l3_name character varying, l4_name character varying, collection_name character varying, aesthetic character varying, color character varying, finish character varying, form character varying, comfort character varying, covering character varying, function character varying, lifestyle character varying, shape character varying, type character varying, is_cadence_generated boolean, is_mapped boolean, price double precision, cost double precision, mapped_product_code_description character varying, mapped_product_code character varying, hierarchy_code integer, master_hierarchy_code character varying, launch_date date, exit_date date, updated_at timestamp without time zone,sku_status text)
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
                l2_name, 
                l3_name, 
                l4_name,
                collection_name, 
                aesthetic, 
                color, 
                finish, 
                form, 
                comfort,
                covering, 
                function, 
                lifestyle, 
                shape, 
                type, 
                is_cadence_generated, 
                is_mapped,
                retail_price as price, 
                replacement_cost as cost, 
                mapped_product_code_description,
                mapped_product_code, 
                hierarchy_code, 
                master_hierarchy_code, 
                launch_date, 
                exit_date,
				updated_at::timestamp,
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