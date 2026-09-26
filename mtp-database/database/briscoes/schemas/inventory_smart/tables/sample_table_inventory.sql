--liquibase formatted sql
--changeset navin.chandan@impactanalytics.co:sample_table_inventory stripComments:false splitStatements:false context:Release_1_0 labels:sample_table_inventory
--comment: initial changeset for sample_table_inventory

CREATE TABLE IF NOT EXISTS inventory_smart.sample_table_inventory (
	product_code text NULL,
	article text NULL,
	store_code text NULL,
	"date" date NULL,
	oo int4 NULL,
	it int4 NULL,
	oh int4 NULL
);
