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
--changeset saad_adeeb:store_unit_capacity stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels: MTP-24096
--comment: Added updated_at and updated_by column

ALTER TABLE inventory_smart.store_unit_capacity ADD updated_at timestamp NULL;
ALTER TABLE inventory_smart.store_unit_capacity ADD updated_by int4 NULL;
ALTER TABLE inventory_smart.store_unit_capacity ADD CONSTRAINT store_unit_capacity_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL;


--changeset jugal_mehra:store_unit_capacity stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels: rlis-687
--comment: Added upload_flag column

ALTER TABLE inventory_smart.store_unit_capacity ADD upload_flag varchar NOT NULL DEFAULT 'false'::character varying;

--changeset karthikeswar:store_unit_capacity stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels: MTP-62526
--comment: added todays allocation_qty column
ALTER TABLE inventory_smart.store_unit_capacity ADD allocated_qty int4 NULL;

--changeset karthikeswar:store_unit_capacity_store_inv stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels: MTP-62526
--comment: added store_inv column, changed default value of store_inv column
ALTER TABLE inventory_smart.store_unit_capacity ADD store_inv int4 NOT NULL DEFAULT 0;

--changeset ishaan_singh:store_unit_capacity stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels: MTP-62526
--comment: added tot_inv, carton_allocated_qty column
ALTER TABLE inventory_smart.store_unit_capacity ADD carton_allocated_qty int4 NULL;
ALTER TABLE inventory_smart.store_unit_capacity ADD tot_inv int4 NULL;