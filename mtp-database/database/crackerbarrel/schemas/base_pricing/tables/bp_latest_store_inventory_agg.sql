--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_latest_store_inventory_agg stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_latest_store_inventory_agg

CREATE TABLE base_pricing.bp_latest_store_inventory_agg (
	store_id int4 NOT NULL,
	oh int4 NULL,
	it int4 NULL,
	oo int4 NULL,
	vendor_oo int4 NULL,
	"date" date NULL,
	total_inventory int4 NULL,
	CONSTRAINT bp_latest_store_inventory_agg_pkey PRIMARY KEY (store_id)
);