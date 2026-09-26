--liquibase formatted sql
--changeset chandrashekar.s:dc_transfer_download_all_sizes runOnChange:true stripComments:false splitStatements:false context: DC-DC Transfer modify download all sizes/MTP-128662
--comment: DC-DC Transfer modify download all sizes
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.dc_transfer_download_all_sizes(refcursor, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.dc_transfer_download_all_sizes(refcursor, jsonb, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare 
_pa_query text;
_sa_query text;
_pa_sa_query text;
_query_meta_filters text;
_query_combine text;
v_gen_random_uuid text  := gen_random_uuid()::varchar;

begin
    _pa_query := inventory_smart.form_dc_dc_transfer_table_filters('dc_transfer_constraints', $2);
    raise notice '_where: %', _pa_query;

    _sa_query := global.form_main_table_filters('store_attributes_filter', $3);
    IF _sa_query IS NOT NULL AND LENGTH(TRIM(_sa_query)) > 0 THEN
        _sa_query := replace(_sa_query, 'WHERE', 'AND');
    ELSE
        _sa_query := '';
    END IF;
    raise notice '_sa_query: %', _sa_query;

    _query_meta_filters := inventory_smart.form_table_query($4); 
    raise notice '_query_meta_filters: %', _query_meta_filters;

    _query_combine := '
    WITH get_article_list AS MATERIALIZED (
        WITH get_data_article_list AS MATERIALIZED (
            SELECT
                *
            FROM (
                SELECT DISTINCT
                    hierarchy->>''article'' as article,
                    dc as dc_code
                FROM inventory_smart.dc_service_levels dsl
                JOIN global.store_attributes_filter saf 
                    ON dsl.dc::int = saf.dc_code
                ' || _pa_query || ' ' || _sa_query || '
            ) b
        ),
        article_recommendations AS (
            SELECT 
                article,
                bool_or(recommendation_flag) as has_recommendation
            FROM inventory_smart.dc_details_table dsl
            WHERE EXISTS (
                SELECT 1 
                FROM get_data_article_list gdal 
                WHERE dsl.article = gdal.article 
                AND dsl.dc_code = gdal.dc_code
            )
            GROUP BY article
        )
        SELECT DISTINCT 
            article,
            has_recommendation
        FROM article_recommendations
        ORDER BY has_recommendation DESC, article
    ),
    article_list AS (
        SELECT article FROM get_article_list
    ),
    allocated_units AS MATERIALIZED (
        SELECT article, dc_code, size, SUM(quantity) as quantity FROM inventory_smart.sku_dc_allocated_units('''', (SELECT array_agg(article) FROM article_list)) GROUP BY article, dc_code, size
    ),
    dc_to_dc_available_units AS MATERIALIZED (
        SELECT * FROM inventory_smart.dc_to_dc_available_units((SELECT string_agg(article, '','')::varchar FROM article_list))
    ),
    available_units AS MATERIALIZED (
        SELECT
            dtda.product_code,
            dtda.article,
            dtda.dc_code,
            dtda.size,
            oh - COALESCE(sdru.quantity, 0) - COALESCE(sda.quantity, 0) as oh
        FROM dc_to_dc_available_units dtda
        LEFT JOIN (SELECT article, size, dc_code, SUM(quantity) AS quantity 
                FROM inventory_smart.sku_dc_reserved_units((SELECT array_agg(article) FROM article_list)) 
                WHERE type <> ''D'' 
                GROUP BY 1,2,3) sdru
            ON dtda.article = sdru.article AND dtda.size = sdru.size 
            AND dtda.dc_code = sdru.dc_code	
        LEFT JOIN allocated_units sda 
            ON dtda.article = sda.article AND dtda.size = sda.size 
            AND dtda.dc_code = sda.dc_code				
    )
    SELECT
        ddt.product_code,
        dsl."hierarchy" ->>''size'' as size,
        paf.product_description,
        ddt.article as choice,
        dsl."hierarchy" ->>''l6_name'' as choice_description,
        ddt.recommendation_flag,
        saf.store_code as dc,
        ddt.excess_deficit_tag as dc_tag,
        ddt.excess_deficit_units,
        COALESCE(au.oh, 0) as total_dc_oh_net_avail_cyclic,
        ddt.demand_projection::INTEGER as demand_projection,
        ddt.next_po_upcoming_units as upcoming_po_units,
        ddt.next_po_upcoming_date as upcoming_po_date,
        dsl.target_wos::INTEGER as dc_twos,
        ddt.sales_forecast::INTEGER as sales_forecast,
        ddt.cwos::INTEGER as dc_cwos,
        dsl.min_stock::INTEGER as dc_min,
        COALESCE(ddt.safety_stock, 0)::INTEGER as safety_stock
    FROM
        inventory_smart.dc_details_table ddt
    LEFT JOIN available_units au
        ON ddt.product_code = au.product_code 
        AND ddt.dc_code = au.dc_code
        AND ddt.article = au.article
    JOIN inventory_smart.dc_service_levels dsl 
        ON ddt.product_code = dsl."hierarchy"->>''product_code''
        AND ddt.dc_code = dsl.dc::integer
    JOIN global.store_attributes_filter saf 
        ON dsl.dc::int = saf.dc_code
    JOIN global.product_attributes_filter paf 
        ON ddt.product_code = paf.product_code
    LEFT JOIN (
        SELECT product_code, size, MIN("order") AS order
        FROM inventory_smart.article_status_tag
        GROUP BY product_code, size
    ) ast 
        ON ddt.product_code = ast.product_code
        AND dsl."hierarchy" ->>''size'' = ast.size
    WHERE ddt.article IN (SELECT article FROM article_list)
    ' || _sa_query || '
    ORDER BY ddt.article, ast.order ASC, saf.store_code';

    _query_combine := 'SELECT * FROM (' || _query_combine || ') as subquery ' || _query_meta_filters;

    raise notice 'query_combine: %', _query_combine;
    open $1 for execute _query_combine;
    perform global.sp_log(v_gen_random_uuid, 'inventory_smart.dc_transfer_download_all_sizes', 'Before Return', _query_combine, jsonb_build_object('product_filter', $2, 'store_filter', $3, 'meta_filters', $4));	
    return $1;

END
$function$
;
