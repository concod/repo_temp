--liquibase formatted sql
--changeset bhaskar.reddy@impactanalytics.co:store_hierachy_filter_flattened runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-43729_new
--comment: initial changeset for store_hierachy_filter_flattened table
--rollback: SELECT 1

DROP VIEW IF EXISTS "global".store_hierarchies_filter_flattened;

CREATE OR REPLACE VIEW "global".store_hierarchies_filter_flattened
AS SELECT hierarchy_code,
    level,
    active,
    path ->> 's10_name'::text AS s0_name,
    path ->> 's0_name'::text AS s1_name,
    path ->> 's1_id_name'::text AS s2_name,
    path ->> 's2_id_name'::text AS s3_name,
    path ->> 's3_id_name'::text AS s4_name
   FROM global.store_hierarchies_filter;
