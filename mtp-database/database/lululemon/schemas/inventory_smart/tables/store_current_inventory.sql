--liquibase formatted sql
--changeset liquibase:store_current_inventory stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_current_inventory

CREATE TABLE IF NOT EXISTS inventory_smart.store_current_inventory (
	store_code varchar NOT NULL,
	total_inv float4 NULL,
	oh float4 NULL,
	it float4 NULL,
	CONSTRAINT store_current_inventory_store_code_key UNIQUE (store_code)
);