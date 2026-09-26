--liquibase formatted sql
--changeset liquibase:product_mapping_product_store_anomaly stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_mapping_product_store_anomaly
CREATE TABLE "global".product_mapping_product_store_anomaly (
	mapping_code int4 NULL,
	mapping_type varchar NULL,
	l0_name varchar NULL,
	product_code varchar NULL,
	store_code varchar NULL,
	is_active bool NULL,
	validity datemultirange NULL,
	deleted_at timestamptz NULL DEFAULT now()
);
CREATE INDEX product_mapping_product_store_anomaly_deleted_at_idx ON global.product_mapping_product_store_anomaly USING btree (deleted_at, mapping_code);

--changeset liquibase:product_mapping_product_store_anomaly_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_mapping_product_store_anomaly_2
ALTER TABLE "global".product_mapping_product_store_anomaly ADD CONSTRAINT product_mapping_product_store_anomaly_pk PRIMARY KEY (mapping_code, l0_name);
