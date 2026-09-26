--liquibase formatted sql
--changeset swapnil.bhange:alerts_product_is_resolved stripComments:false splitStatements:false context:Release_1_0 labels:1234
--comment: create table schema for alerts_product_is_resolved
CREATE TABLE "global".alerts_product_is_resolved (
	product_code varchar(50) NULL,
	nsfe_is_resolved int4 NULL,
	pdfesc_is_resolved int4 NULL,
	pdfep_is_resolved int4 NULL,
	uip_is_resolved int4 NULL,
	uisc_is_resolved int4 NULL,
	cf_is_resolved int4 NULL
);
-- "global".alerts_product_is_resolved foreign key
ALTER TABLE "global".alerts_product_is_resolved ADD CONSTRAINT alerts_product_is_resolved_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE;

--changeset swapnil.bhange@impactanalytics.co:alerts_product_is_resolved_2 stripComments:false splitStatements:false context:Release_1_0 labels:123456
--comment: updated schema for alerts_product_is_resolved_2
ALTER TABLE "global".alerts_product_is_resolved ADD COLUMN IF NOT EXISTS zfsa_is_resolved int4 NULL;
ALTER TABLE "global".alerts_product_is_resolved ADD COLUMN IF NOT EXISTS zfea_is_resolved int4 NULL;

--changeset swapnil.bhange@impactanalytics.co:alerts_product_is_resolved_3 stripComments:false splitStatements:false context:Release_1_0 labels:123456
--comment: updated schema for alerts_product_is_resolved_3
ALTER TABLE "global".alerts_product_is_resolved DROP CONSTRAINT IF EXISTS alerts_product_is_resolved_pk;
ALTER TABLE "global".alerts_product_is_resolved ADD CONSTRAINT alerts_product_is_resolved_pk PRIMARY KEY (product_code);
