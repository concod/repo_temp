--liquibase formatted sql
--changeset siddharth.bajpai@impactanalytics.co:product_mapping_product_store stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_mapping_product_store

DROP TABLE IF EXISTS "global".product_mapping_product_store CASCADE;
CREATE TABLE "global".product_mapping_product_store (
	mapping_code serial4 NOT NULL,
	mapping_type varchar NOT NULL,
	l0_name varchar NOT NULL,
	product_code varchar NOT NULL,
	store_code varchar NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	validity datemultirange NULL,
	updated_by int4 NULL,
	inv_source_flag int2 DEFAULT 0 NULL,
	updated_at timestamptz DEFAULT now() NULL,
	creation_source_id int4 DEFAULT 0 NULL,
	current_updation_id int4 DEFAULT 0 NULL,
	CONSTRAINT product_mapping_product_store_pk PRIMARY KEY (mapping_code, l0_name),
	CONSTRAINT product_store_mapping_un UNIQUE (l0_name, product_code, store_code),
	CONSTRAINT product_mapping_product_store_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE,
	CONSTRAINT product_mapping_product_store_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE,
	CONSTRAINT product_mapping_product_store_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL
)
PARTITION BY LIST (l0_name);
CREATE INDEX product_mapping_product_store_prod_code ON global.product_mapping_product_store USING btree (l0_name, product_code);
CREATE INDEX product_mapping_product_store_product_code_idx ON global.product_mapping_product_store USING btree (product_code);
CREATE INDEX product_mapping_product_store_store_code_idx ON global.product_mapping_product_store USING btree (store_code);
