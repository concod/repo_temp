
--liquibase formatted sql
--changeset sreevathsa.sp@impactanalytics.co:product_store_attributes_filter_store_code stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:pacsun_product_store_attributes_filter_store_code
--comment: initial changeset for product_store_attributes_filter_store_code

CREATE TABLE if not exists "global".product_store_attributes_filter_store_code (
	psa_code text NOT NULL,
	l0_name text NULL,
	store_code text NOT NULL,
	psa_name varchar NULL,
	CONSTRAINT product_store_attributes_filter_store_code_pk PRIMARY KEY (psa_code)
);
CREATE INDEX if not exists product_store_attributes_filter_store_code_l0_name_idx ON global.product_store_attributes_filter_store_code USING btree (l0_name);


--changeset sreevathsa.sp@impactanalytics.co:new_column_add_product_store_attributes_filter_store_code stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:new_column_add_pacsun_product_store_attributes_filter_store_code
--comment: changeset for new_column_add_product_store_attributes_filter_store_code
ALTER TABLE "global".product_store_attributes_filter_store_code ADD COLUMN IF NOT EXISTS l1_name varchar null;




--changeset sreevathsa.sp@impactanalytics.co:deleting_l1_name_product_store_attributes_filter_store_code_v1 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:pacsun_deleting_l1_name_product_store_attributes_filter_store_code
--comment: changeset for deleting_l1_name_product_store_attributes_filter_store_code
ALTER TABLE "global".product_store_attributes_filter_store_code DROP COLUMN IF EXISTS l1_name;

