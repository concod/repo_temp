--liquibase formatted sql
--changeset ashish_gupta:product_store_attributes_filter_lookup stripComments:false runOnChange:true splitStatements:false context:Release_1_1 labels:intial
--comment: initial changeset for product_store_attributes_filter_lookup
CREATE MATERIALIZED VIEW "global".product_store_attributes_filter_lookup as
select store_code, array_agg(distinct psa_code) as psa_codes from
global.product_store_attributes_filter
group by 1;
CREATE INDEX product_store_attributes_filter_lookup_store_code_idx ON "global".product_store_attributes_filter_lookup (store_code);
