--liquibase formatted sql
--changeset dodda.gowtham@impactanalytics.co:get_new_sku_likeliness_scores stripComments:false runOnChange:true splitStatements:false context:query_updated labels:itemsmart_initial_commit
--comment: initial changeset for get_new_sku_likeliness_scores
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.get_new_sku_likeliness_scores(new_sku_id_param text);
DROP FUNCTION IF EXISTS item_smart.get_new_sku_likeliness_scores(new_sku_id_param text, where_clause text);
CREATE OR REPLACE FUNCTION item_smart.get_new_sku_likeliness_scores(new_sku_id_param text, where_clause text DEFAULT NULL)
 RETURNS TABLE(
    product_code varchar,
    product_description text,
    likeness_score float8,
    attributes jsonb,
    l0_name varchar,
    l1_name varchar,
    l2_name varchar,
    l3_name varchar,
    l4_name varchar,
    l5_name varchar
)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_gen_random_uuid text := gen_random_uuid()::varchar;
    final_sql text;
    cleaned_where_clause text;
BEGIN
    -- perform sp log
    perform global.sp_log(v_gen_random_uuid, 'item_smart.get_new_sku_likeliness_scores', 'function started', '', jsonb_build_object('new_sku_id_param', $1, 'where_clause', $2));

    -- Clean the where_clause to remove any leading "WHERE" keyword
    IF where_clause IS NOT NULL AND where_clause != '' THEN
        cleaned_where_clause := trim(where_clause);
        -- Remove leading "WHERE" keyword (case insensitive)
        IF lower(left(cleaned_where_clause, 5)) = 'where' THEN
            cleaned_where_clause := trim(substring(cleaned_where_clause from 6));
        END IF;
    END IF;

    -- Build the final query with dynamic where clause
    final_sql := format(
        'SELECT 
            mphf.product_code::varchar as product_code,
            mphf.product_description::text as product_description,
            sls.likeliness_score::float8 as likeness_score,
            jsonb_build_object(
                ''Color'', mphf.color,
                ''Size'', mphf.size,
                ''Shape'', mphf.tree_shape,
                ''Light Type'', mphf.light_type,
                ''Set/Each'', mphf.size_set_pack,
                ''Catalog'', mphf.print_catalog,
                ''Dropship'', mphf.drop_ship,
                ''Status'', mphf.channel_status,
                ''Vendor'', mphf.vendor,
                ''Country of Origin'', mphf.country_of_origin
            ) as attributes,
            mphf.l0_name::varchar as l0_name,
            mphf.l1_name::varchar as l1_name,
            mphf.l2_name::varchar as l2_name,
            mphf.l3_name::varchar as l3_name,
            mphf.l4_name::varchar as l4_name,
            mphf.l5_name::varchar as l5_name
        FROM item_smart.sku_likeliness_score sls
        INNER JOIN item_smart.mv_product_hierarchies_filter mphf 
            ON mphf.product_code = sls.sku_id
        WHERE sls.new_sku_id = %L %s
        ORDER BY sls.likeliness_score DESC',
        new_sku_id_param,
        CASE
            WHEN cleaned_where_clause IS NULL OR cleaned_where_clause = '' THEN ''
            ELSE 'AND ' || cleaned_where_clause
        END
    );

    -- Log the query for debugging
    RAISE NOTICE 'Executing query: %', final_sql;

    -- perform sp log
    perform global.sp_log(v_gen_random_uuid, 'item_smart.get_new_sku_likeliness_scores', 'before returning final_sql', final_sql, jsonb_build_object('new_sku_id_param', $1, 'where_clause', $2));

    -- Execute the query
    RETURN QUERY EXECUTE final_sql;

    -- perform sp log
    perform global.sp_log(v_gen_random_uuid, 'item_smart.get_new_sku_likeliness_scores', 'function completed', '', jsonb_build_object('new_sku_id_param', $1, 'where_clause', $2));

END;
$function$
; 