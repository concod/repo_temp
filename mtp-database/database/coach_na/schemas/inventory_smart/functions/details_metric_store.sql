--liquibase formatted sql
--changeset adesh:details_metric_store runOnChange:true stripComments:false splitStatements:false context:MTP-122243 labels:MTP-122243
--comment: MTP-122243 add kpi_names parameter support
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.details_metric_store(jsonb,character varying,character varying,jsonb);
DROP FUNCTION IF EXISTS inventory_smart.details_metric_store(store_attributes jsonb, table_filters jsonb, article character varying, metrics character varying);
DROP FUNCTION IF EXISTS inventory_smart.details_metric_store(store_attributes jsonb, table_filters jsonb, article character varying, metrics character varying, kpi_names jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.details_metric_store(store_attributes jsonb, table_filters jsonb, article character varying, metrics character varying, kpi_names jsonb DEFAULT '[]'::jsonb)
 RETURNS TABLE(store_name character varying,
                store_code character varying, 
                store_oh double precision,
                store_it double precision,
                store_oo double precision,
                wos_oh_oo_it real,
                lw_sales_units integer,
                lw_revenue integer,
                wtd_sales_units integer,
                wtd_revenue real
                )
 LANGUAGE plpgsql
AS $function$
 DECLARE
    _query_sa TEXT := '';
    _query_table_filters TEXT := '';
    _filter_query TEXT := '';
    _query_combine TEXT := '';
    v_gen_random_uuid text  := gen_random_uuid()::varchar;
BEGIN
    RAISE NOTICE 'kpi_names --> %', kpi_names;

    _query_sa := global.form_attribute_table_filters_v2('store_attributes', 'store_code', store_attributes);
    
    -- The form_attribute_table_filters_v2 function returns a complete query
    -- We need to modify it to include additional filters for article and metrics
    _filter_query := CASE 
                         WHEN article != '' AND metrics != '' THEN
                             FORMAT(' AND article = %L AND %I = 1', article, metrics)
                         WHEN article != '' THEN
                             FORMAT(' AND article = %L', article)
                         ELSE 
                             '' 
                     END;
                     
    
    _query_combine := FORMAT($$
        WITH store_attributes_data AS (
            %s
        )
        SELECT 
            aid.store_name,
            aid.store_code, 
            aid.store_oh,
            aid.store_it,
            aid.store_oo,
            aid.wos_oh_oo_it, 
            aid.lw_sales_units, 
            aid.lw_revenue,
            aid.wtd_sales_units, 
            aid.wtd_revenue
        FROM 
            inventory_smart.article_inventory_dashboard aid
        JOIN 
            store_attributes_data sad ON aid.store_code = sad.store_code
        %s
    $$, _query_sa, _filter_query);
    
    RAISE NOTICE '%', _query_combine;
	perform  global.sp_log(v_gen_random_uuid,'inventory_smart.details_metric_store', 'Before RETURN',_query_combine,jsonb_build_object('store_attributes', $1, 'table_filters', $2, 'article', $3, 'metrics', $4, 'kpi_names', $5));
    RETURN QUERY EXECUTE _query_combine;
END
 $function$
;

