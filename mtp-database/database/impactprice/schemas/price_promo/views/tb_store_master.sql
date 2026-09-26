--liquibase formatted sql
--changeset sreevathsa.sp@impactanalytics.co:tb_store_master_view_price_promo_20251224 runAlways:true stripComments:false splitStatements:false context:Release_1_0 labels:tb_store_master
--comment: tb_store_master view for price_promo schema
--rollback: SELECT 1
DROP VIEW IF EXISTS price_promo.tb_store_master;