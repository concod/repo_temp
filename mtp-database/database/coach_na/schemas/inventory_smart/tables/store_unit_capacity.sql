--liquibase formatted sql
--changeset aiyush.prasad@impactanalytics.co:store_unit_capacity stripComments:false splitStatements:false context:Release_1_0 labels:pacsun_store_unit_capacity
--comment: initial changeset for store_unit_capacity

CREATE TABLE   inventory_smart.store_unit_capacity (
	store_code varchar NOT NULL,
	unit_capacity float4 NOT NULL,
	updated_at timestamp NULL,
	updated_by int4 NULL,
	product_hierarchy varchar NULL,
	CONSTRAINT store_unit_capacity_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE,
	CONSTRAINT store_unit_capacity_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL
);

--changeset hemantkumar.bajaj@impactanalytics.co:store_unit_capacity stripComments:false splitStatements:false context:Release_1_0 labels:store_unit_capacity
--comment: adding column l0/l1/l2
ALTER TABLE inventory_smart.store_unit_capacity ADD COLUMN IF NOT EXISTS l1_name varchar NULL;
ALTER TABLE inventory_smart.store_unit_capacity ADD COLUMN IF NOT EXISTS l2_name varchar NULL;
ALTER TABLE inventory_smart.store_unit_capacity ADD COLUMN IF NOT EXISTS l0_name varchar NULL;
ALTER TABLE inventory_smart.store_unit_capacity ADD CONSTRAINT store_unit_capacity_pk PRIMARY KEY (store_code, product_hierarchy);

--changeset hemantkumar.bajaj@impactanalytics.co:store_unit_capacity_v2 stripComments:false splitStatements:false context:Release_1_0 labels:store_unit_capacity
--comment: dropping column l0/l1/l2

ALTER TABLE inventory_smart.store_unit_capacity
DROP COLUMN l0_name;
ALTER TABLE inventory_smart.store_unit_capacity
DROP COLUMN l1_name;
ALTER TABLE inventory_smart.store_unit_capacity
DROP COLUMN l2_name;