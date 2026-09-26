--liquibase formatted sql
--changeset suchithra.pr@impactanalytics.co:refresh_mv_product_hierarchies_filter runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_initial_commit
--comment: initial changeset for item_smart.refresh_mv_product_hierarchies_filter
--rollback: SELECT 1


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
