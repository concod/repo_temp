--liquibase formatted sql
--changeset gauri.nair@impactanalytics.co:store_unit_capacity stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts
--comment: initial changeset for store_unit_capacity

CREATE TABLE if not exists inventory_smart.store_unit_capacity (
	product_hierarchy varchar NOT NULL,
	store_code varchar NOT NULL,
	unit_capacity float4 NULL,
    updated_at timestamp NULL,
    updated_by int4 NULL,
    CONSTRAINT store_unit_capacity_un UNIQUE (product_hierarchy, store_code),
	CONSTRAINT store_unit_capacity_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE,
	CONSTRAINT store_unit_capacity_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL
);