--liquibase formatted sql
--changeset suchithra.pr@impactanalytics.co:refresh_mv_product_hierarchies_filter stripComments:false runOnChange:true splitStatements:false context:query_updated labels:itemsmart_initial_commit
--comment: initial changeset for refresh_mv_product_hierarchies_filter

DROP PROCEDURE IF EXISTS item_smart.refresh_mv_product_hierarchies_filter();
CREATE OR REPLACE PROCEDURE item_smart.refresh_mv_product_hierarchies_filter()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
BEGIN
  
    REFRESH MATERIALIZED VIEW item_smart.mv_product_hierarchies_filter;
   
    RAISE NOTICE 'Materialized view refreshed successfully';
END;
$procedure$
;
