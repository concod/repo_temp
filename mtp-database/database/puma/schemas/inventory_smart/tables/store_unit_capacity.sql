--liquibase formatted sql
--changeset anshuman.ghosh@impactanalytics.co:store_unit_capacity stripComments:false splitStatements:false context:QUERY_SYNC labels:QUERY_SYNC
--comment Query sync for store unit capacity
CREATE TABLE inventory_smart.store_unit_capacity (
	product_hierarchy varchar NOT NULL,
	store_code varchar NOT NULL,
	unit_capacity float4 NOT NULL,
	CONSTRAINT store_unit_capacity_un UNIQUE (product_hierarchy, store_code)
);