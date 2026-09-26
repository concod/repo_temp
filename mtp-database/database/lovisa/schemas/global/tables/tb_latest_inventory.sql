--liquibase formatted sql
--changeset keerthana.reddy@impactanalytics.co:tb_latest_inventory_24092025 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: updated schema for lovisa tb_latest_inventory

CREATE TABLE "global".tb_latest_inventory (
	store_code text NULL,
	store_id int4 NOT NULL,
	product_code text NULL,
	product_id int4 NOT NULL,
	"date" date NULL,
	oh int4 NULL,
	it int4 NULL,
	oo int4 NULL,
	total_inventory int4 NULL,
	age int4 NULL,
	clearance_indicator int4 NULL,
	clearance_eligible int4 NULL,
	vendor_oo int4 NULL,
	style_cuq text NULL,
	lifecycle_indicator text NULL,
	st float4 NULL,
	store_grade varchar NULL,
	store_grade_id int4 NULL,
	dc_oh int4 NULL,
	dc_it int4 NULL,
	dc_oo int4 NULL,
	CONSTRAINT tb_latest_inventory_pk PRIMARY KEY (product_id, store_id)
);
