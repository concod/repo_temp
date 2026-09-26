--liquibase formatted sql
--changeset adesh:details_metric_store runOnChange:true stripComments:false splitStatements:false context:MTP-122243 labels:MTP-122243
--comment: MTP-122243 add kpi_names parameter support
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.details_metric_store(jsonb, jsonb, character varying, character varying);
DROP FUNCTION IF EXISTS inventory_smart.details_metric_store(jsonb, character varying, character varying, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.details_metric_store(jsonb, jsonb, character varying, character varying, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.details_metric_store(store_attributes jsonb, table_filters jsonb, article character varying, metrics character varying, kpi_names jsonb DEFAULT '[]'::jsonb)
 RETURNS TABLE(
    store_code character varying, 
    store_name character varying, 
    oh integer, 
    oo integer, 
    it integer, 
    wos real, 
    size_integrity_oh_oo_it real, 
    lw_units integer, 
    lw_revenue real, 
    lw_margin real
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

    _query_sa := global.form_main_table_filters('store_attributes_filter', store_attributes);
    
    _filter_query := _query_sa || 
                     CASE 
                         WHEN LENGTH(_query_sa) > 0 AND article != '' AND metrics != '' THEN
                             FORMAT(' AND article = %L AND %I = 1', article, metrics)
                         WHEN LENGTH(_query_sa) > 0 AND article != '' THEN
                             FORMAT(' AND article = %L', article)
                         WHEN article != '' AND metrics != '' THEN
                             FORMAT('WHERE article = %L AND %I = 1', article, metrics)
                         WHEN article != '' THEN
                             FORMAT('WHERE article = %L', article)
                         ELSE 
                             '' 
                     END;
                     
    _query_table_filters := global.form_table_query(table_filters);
    
    _query_combine := FORMAT($$
        WITH 
        base_query AS (
            SELECT 
                store_code, 
              	store_name,
                oh,
                oo,
                it, 
                wos,
               	si_oh_oo_it as size_integrity_oh_oo_it,
                lw_units,
                lw_revenue, 
                lw_margin
            FROM 
                inventory_smart.article_inventory_dashboard  
            %s
        )
        SELECT * 
        FROM base_query
        %s
        ORDER BY lw_units DESC
    $$, _filter_query, _query_table_filters);
    
    RAISE NOTICE '%', _query_combine;
	perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.details_metric_store', 'Before returning function value',_query_combine,jsonb_build_object('store_attributes',store_attributes,'table_filters',table_filters,'article',article,'metrics',metrics,'kpi_names',kpi_names));
    RETURN QUERY EXECUTE _query_combine;
END
$function$;
