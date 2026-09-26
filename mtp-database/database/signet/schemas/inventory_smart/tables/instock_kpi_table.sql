--liquibase formatted sql
--changeset liquibase:instock_kpi_table stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for instock_kpi_table
CREATE TABLE inventory_smart.instock_kpi_table (
	store_code varchar NOT NULL,
	product_code varchar NOT NULL,
	oh_flag int4 NULL,
	"date" date NOT NULL,
	product_channel_name varchar NULL,
	l0_name varchar NOT NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	merchandise_category varchar NULL,
	planning_ownership varchar NULL,
	store_code_name varchar NOT NULL,
	store_channel_description varchar NOT NULL,
	channel varchar NOT NULL,
	state varchar NULL,
	district varchar NULL,
	city varchar NULL,
	store_description text NULL,
	CONSTRAINT instock_kpi_table_un UNIQUE (product_code, store_code, date)
);

ALTER TABLE inventory_smart.instock_kpi_table ADD CONSTRAINT instock_kpi_table_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE;
ALTER TABLE inventory_smart.instock_kpi_table ADD CONSTRAINT instock_kpi_table_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE;
--changeset laraib.ahmad:instock_kpi_table stripComments:false splitStatements:false context:Release_1_0 labels:MTP-23523
--comment: adding store_access_hierarchy and store_access_hierarchy
ALTER TABLE inventory_smart.instock_kpi_table  ADD COLUMN IF NOT EXISTS product_access_hierarchy varchar NULL;
ALTER TABLE inventory_smart.instock_kpi_table  ADD COLUMN IF NOT EXISTS store_access_hierarchy varchar NULL;