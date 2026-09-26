--liquibase formatted sql
--changeset liquibase:soft_allocation stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for soft_allocation
CREATE TABLE inventory_smart.soft_allocation (
	product_code varchar NOT NULL,
	store_code varchar NOT NULL,
	channel varchar NOT NULL,
	available_qty int4 NOT NULL,
	allocated_qty int4 NOT NULL,
	CONSTRAINT soft_allocation_un UNIQUE (product_code, store_code, channel)
);
ALTER TABLE inventory_smart.soft_allocation ADD CONSTRAINT soft_allocation_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE;
ALTER TABLE inventory_smart.soft_allocation ADD CONSTRAINT soft_allocation_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE;
