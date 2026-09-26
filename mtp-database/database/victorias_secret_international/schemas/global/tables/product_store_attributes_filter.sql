--liquibase formatted sql
--changeset pradeep.kumar:product_store_attributes_filter_update_dev stripComments:false splitStatements:false context:Release_1_0 labels:adding_if_not_exists
--comment: removing drop statement and adding if not exists

CREATE TABLE IF NOT EXISTS "global".product_store_attributes_filter (
	psa_code varchar NOT NULL,
	l0_id varchar NULL,
	l0_name varchar NULL,
	l3_id varchar NULL,
	l3_name varchar NULL,
	l4_id varchar NULL,
	l4_name varchar NULL,
	l5_id varchar NULL,
	l5_name varchar NULL,
	l6_id varchar NULL,
	l6_name varchar NOT NULL,
	store_code varchar NOT NULL,
	psa_name varchar NULL,
	terminal_flag int4 NULL,
	CONSTRAINT product_store_l6_attributes_filter_pk PRIMARY KEY (psa_code, store_code, l6_name)
);
CREATE INDEX  IF NOT EXISTS product_store_attributes_filter_l0_name_idx ON global.product_store_attributes_filter USING btree (l0_name);
CREATE INDEX IF NOT EXISTS product_store_attributes_filter_l6_name_idx ON global.product_store_attributes_filter USING btree (l6_name);

--changeset kanishka.parashar@impactanalytics.co:psaf_column_addition stripComments:false splitStatements:false context:VS_inv_smart labels:VPP-336
--comment: adding column
alter table global.product_store_attributes_filter 
add column vsba_regional_dc_descr varchar null;

--changeset linu.nazil@impactanalytics.co:product_store_attributes_filter_v3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding store_hierarchy_level column
ALTER TABLE global.product_store_attributes_filter ADD COLUMN IF NOT EXISTS store_hierarchy_level text[] DEFAULT ARRAY[]::text[];
