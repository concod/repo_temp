--liquibase formatted sql
--changeset samridhi.gupta@impactanalytics.co:store_unit_capacity stripComments:false splitStatements:false context:Release_1_0 labels:sm_store_unit_capacity
--comment: initial changeset for store_unit_capacity

CREATE TABLE if NOT exists inventory_smart.store_unit_capacity (
	product_hierarchy varchar NOT NULL,
	store_code varchar NOT NULL,
	unit_capacity float4 NOT NULL,
	updated_at timestamp NULL,
	updated_by int4 NULL,
	CONSTRAINT store_unit_capacity_un UNIQUE (product_hierarchy, store_code),
	CONSTRAINT store_unit_capacity_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE,
	CONSTRAINT store_unit_capacity_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL
);
