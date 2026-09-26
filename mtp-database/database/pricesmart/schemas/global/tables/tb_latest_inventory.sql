--liquibase formatted sql
--changeset liquibase:tb_latest_inventory_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_latest_inventory with if not exists
CREATE TABLE "global".tb_latest_inventory (
	s0_id int4 NULL,
	s0_name varchar(50) NULL,
	s1_id int4 NULL,
	s1_name varchar(50) NULL,
	store_id int4 NULL,
	style_cuq varchar(50) NULL,
	product_id int4 NULL,
	clearance_indicator int4 NULL,
	"date" date NULL,
	oh int4 NULL,
	it int4 NULL,
	oo int4 NULL,
	vendor_oo int4 NULL,
	total_inventory int4 NULL,
	clearance_indicator_rf int4 NULL,
	lifecycle_indicator_rf text NULL,
	st float8 NULL,
	age int4 NULL,
	clearance_eligible int4 NULL
);
CREATE INDEX mkd_inv_prod_store_id_idx ON global.tb_latest_inventory USING btree (product_id, store_id);