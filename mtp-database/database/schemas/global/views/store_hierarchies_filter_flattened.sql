--liquibase formatted sql
--changeset liquibase:store_hierarchies_filter_flattened_1 runOnChange:true stripComments:false splitStatements:false context:MTP-67427 labels:MTP-67427
--comment: validity column added for store_hierarchies_filter_flattened view
DROP VIEW IF EXISTS global.store_hierarchies_filter_flattened;
CREATE OR REPLACE VIEW "global".store_hierarchies_filter_flattened
AS SELECT store_hierarchies_filter.hierarchy_code,
    store_hierarchies_filter.level,
    store_hierarchies_filter.active,
    store_hierarchies_filter.path ->> 's0_name'::text AS s0_name,
    store_hierarchies_filter.path ->> 's1_name'::text AS s1_name,
    store_hierarchies_filter.path ->> 's2_name'::text AS s2_name,
    store_hierarchies_filter.path ->> 's3_name'::text AS s3_name,
    store_hierarchies_filter.path ->> 's4_name'::text AS s4_name,
    store_hierarchies_filter.path ->> 's5_name'::text AS s5_name,
    store_hierarchies_filter.path ->> 's6_name'::text AS s6_name,
    store_hierarchies_filter.path ->> 's7_name'::text AS s7_name,
    store_hierarchies_filter.path ->> 's8_name'::text AS s8_name,
    store_hierarchies_filter.path ->> 's9_name'::text AS s9_name,
    store_hierarchies_filter.path ->> 'store_code'::text AS store_code
   FROM global.store_hierarchies_filter;
   