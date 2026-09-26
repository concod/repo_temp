--liquibase formatted sql
--changeset pranshu.pandey@impactanalytics.co:tb_latest_inventory_consolidated stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: consolidated changeset for tb_latest_inventory

CREATE TABLE IF NOT EXISTS "pricesmart".tb_latest_inventory (
	s0_id int4 NULL,
	s0_name varchar(50) NULL,
	s1_id int4 NULL,
	s1_name varchar(50) NULL,
	store_id int4 NOT NULL,
	style_cuq varchar(50) NULL,
	product_id int4 NOT NULL,
	clearance_indicator int4 NULL,
	"date" date NOT NULL,
	oh int4 NULL,
	it int4 NULL,
	oo int4 NULL,
	vendor_oo int4 NULL,
	dc_oh int4 NULL,
	dc_it int4 NULL,
	dc_oo int4 NULL,
	total_inventory int4 NULL,
	clearance_indicator_rf int4 NULL,
	lifecycle_indicator_rf text NULL,
	st float8 NULL,
	age int4 NULL,
	clearance_eligible int4 NULL,
	CONSTRAINT tb_latest_inventory_pkey PRIMARY KEY (product_id, store_id, date)
);
CREATE INDEX IF NOT EXISTS idx_tb_latest_inventory_date ON pricesmart.tb_latest_inventory USING btree (date);
CREATE INDEX IF NOT EXISTS idx_tb_latest_inventory_store_product ON pricesmart.tb_latest_inventory USING btree (store_id, product_id);
