--liquibase formatted sql
--changeset ujjawal.singh@impactanalytics.co:store_hierarchies_filter_flattened_1 runOnChange:true stripComments:false splitStatements:false context:MTP-67427 labels:MTP-67427
--comment: intial changeset store_hierarchies_filter_flattened


DROP VIEW IF EXISTS global.store_hierarchies_filter_flattened;
CREATE OR REPLACE VIEW "global".store_hierarchies_filter_flattened
AS SELECT hierarchy_code,
    level,
    active,
    path ->> 's10_name'::text AS s0_name,
    path ->> 'channel_plan'::text AS s1_name,
    path ->> 'store_code'::text AS store_code
   FROM global.store_hierarchies_filter;


   