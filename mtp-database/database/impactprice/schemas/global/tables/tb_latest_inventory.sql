--liquibase formatted sql
--changeset liquibase:tb_latest_inventory stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_latest_inventory

CREATE TABLE "global".tb_latest_inventory (
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
CREATE INDEX idx_tb_latest_inventory_date ON global.tb_latest_inventory USING btree (date);
CREATE INDEX idx_tb_latest_inventory_store_product ON global.tb_latest_inventory USING btree (store_id, product_id);

--changeset siddharth.bajpai@impactanalytics.co:drop_view_create_table_tb_latest_inventory_20251216 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:tb_latest_inventory
--comment: drop tb_latest_inventory
DROP TABLE IF EXISTS "global".tb_latest_inventory CASCADE;
