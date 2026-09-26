--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:tb_inventory_master  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_inventory_master

CREATE TABLE IF NOT EXISTS "global".tb_inventory_master (
	product_id int4 NOT NULL,
	clearance_indicator int4 NULL,
	"date" date NOT NULL,
	oh int4 NULL,
	it int4 NULL,
	oo int4 NULL,
	vendor_oo int4 NULL,
	total_inventory int4 NULL,
	clearance_indicator_rf text NULL,
	lifecycle int4 NULL,
	age int4 NULL,
	st int4 NULL,
	clearance_eligible int4 NULL,
	store_id int4 NOT NULL,
	ps_reco_level text NULL,
	CONSTRAINT tb_inventory_master_pk PRIMARY KEY (product_id, store_id, date)
);