--liquibase formatted sql
--changeset adesh:details_metric_store runOnChange:true stripComments:false splitStatements:false context:MTP-122243 labels:MTP-122243
--comment: MTP-122243 add kpi_names parameter support 
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.details_metric_store(jsonb,character varying,character varying,jsonb);
DROP FUNCTION IF EXISTS inventory_smart.details_metric_store(store_attributes jsonb, table_filters jsonb, article character varying, metrics character varying);
DROP FUNCTION IF EXISTS inventory_smart.details_metric_store(store_attributes jsonb, table_filters jsonb, article character varying, metrics character varying, kpi_names jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.details_metric_store(store_attributes jsonb, table_filters jsonb, article character varying, metrics character varying, kpi_names jsonb DEFAULT '[]'::jsonb)
 RETURNS TABLE(store_code character varying, 
 				store_name character varying,
                planning_channel character varying,
                planning_division character varying,
                partner_group_name character varying,
                regional_master_name character varying,
                store_format_description character varying,
                vsba_regional_dc_descr character varying,
                region_name character varying,
                s1_name  character varying,
                s3_name character varying,
                s4_name character varying,
                store_tier character varying,
                oh integer,
                oo integer,
                it integer, 
                initial_oh integer,
                rfid_delta integer,
                epc_units integer,
                tot_inv real,
                wip  integer,
                last_week_sales  real,
                last_week_revenue  real,
                l4w_avg_sales  real,
                week_to_date_sales  real,
                store_forward_wos  real,
                r_site_forward_wos  real,
                size_integrity_oh  real,
                size_integrity_oh_oo_it  real
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
                     
    
    _query_combine := FORMAT($$
       
            SELECT 
                store_code,
                store_name,
                channel as planning_channel,
                planning_division,
                partner_group_name,
                regional_master_name,
                store_format_description,
                vsba_regional_dc_descr,
                region_name,
                s1_name,
                s3_name,
                s4_name,
                store_tier,
                oh,
                oo,
                it,
                initial_oh,
                rfid_delta,
                epc_units,
                tot_inv,
                wip,
                last_week_sales,
                last_week_revenue,
                l4w_avg_sales,
                week_to_date_sales,
                store_forward_wos,
                r_site_forward_wos,
                size_integrity_oh,
                size_integrity_oh_oo_it
            FROM 
                inventory_smart.article_inventory_dashboard  
            %s
       
    $$, _filter_query);
    
    RAISE NOTICE '%', _query_combine;
	perform  global.sp_log(v_gen_random_uuid,'inventory_smart.details_metric_store', 'Before RETURN',_query_combine,jsonb_build_object('store_attributes', $1, 'table_filters', $2, 'article', $3, 'metrics', $4, 'kpi_names', $5));
    RETURN QUERY EXECUTE _query_combine;
END
 $function$
;

