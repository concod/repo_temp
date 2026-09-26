--liquibase formatted sql
--changeset swapnil.bhange@impactanalytics.co:alerts_product_store_is_resolved_1 stripComments:false splitStatements:false context:Release_1_0 labels:1234_1
--comment: create table schema for alerts_product_store_is_resolved
CREATE TABLE IF NOT EXISTS "global".alerts_product_store_is_resolved (
	product_code varchar(50) NULL,
	store_code varchar(50) NULL,
	fom_is_resolved int4 NULL,
    msviaf_is_resolved int4 NULL
);
-- "global".alerts_product_is_resolved foreign key
ALTER TABLE "global".alerts_product_store_is_resolved DROP CONSTRAINT IF EXISTS alerts_product_store_is_resolved_product_fk;
ALTER TABLE "global".alerts_product_store_is_resolved DROP CONSTRAINT IF EXISTS alerts_product_store_is_resolved_store_fk;
ALTER TABLE "global".alerts_product_store_is_resolved ADD CONSTRAINT alerts_product_store_is_resolved_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE;
ALTER TABLE "global".alerts_product_store_is_resolved ADD CONSTRAINT alerts_product_store_is_resolved_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE;

--changeset rishitha.gangadhara@impactanalytics.co:alerts_product_store_is_resolved_2 stripComments:false splitStatements:false context:Release_1_0 labels:1234_1
--comment: create table schema for alerts_product_store_is_resolved_2
ALTER TABLE "global".alerts_product_store_is_resolved DROP CONSTRAINT IF EXISTS alerts_product_store_is_resolved_pk;
ALTER TABLE "global".alerts_product_store_is_resolved ADD CONSTRAINT alerts_product_store_is_resolved_pk PRIMARY KEY (product_code, store_code);
