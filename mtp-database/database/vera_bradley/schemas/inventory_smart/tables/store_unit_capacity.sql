--liquibase formatted sql
--changeset liquibase:store_unit_capacity stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_unit_capacity
CREATE TABLE inventory_smart.store_unit_capacity (
	product_hierarchy varchar NOT NULL,
	store_code varchar NOT NULL,
	unit_capacity float4 NOT NULL,
	CONSTRAINT store_unit_capacity_un UNIQUE (product_hierarchy, store_code)
);
ALTER TABLE inventory_smart.store_unit_capacity ADD CONSTRAINT store_unit_capacity_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE;
