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

--changeset saad_adeeb:store_unit_capacity_2cols_add stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels: MTP-34236
--comment: Added carton_capacity and reciept_capacity
ALTER TABLE inventory_smart.store_unit_capacity ADD receipt_capacity float4 NULL;
ALTER TABLE inventory_smart.store_unit_capacity ADD carton_capacity float4 NULL;

--changeset sai_rohit:store_unit_capacity_upload stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels: MTP-42411
--comment: Added upload_flag
ALTER TABLE inventory_smart.store_unit_capacity ADD upload_flag varchar NOT NULL DEFAULT 'false'::character varying;


--changeset saad_adeeb:store_unit_capacity_soft_constraint stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels: MTP-43419
--comment: Added upload_flag
ALTER TABLE inventory_smart.store_unit_capacity ADD allocated_qty int4 NULL;
ALTER TABLE inventory_smart.store_unit_capacity ADD carton_allocated_qty int4 NULL;
ALTER TABLE inventory_smart.store_unit_capacity ADD tot_inv int4 NULL;

--changeset shubham_singh:store_unit_capacity_soft_constraint stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels:MTP-96837
--comment: updated datatype of updated_at column
ALTER TABLE inventory_smart.store_unit_capacity
ALTER COLUMN updated_at TYPE timestamptz
USING updated_at AT TIME ZONE 'Asia/Hong_Kong';

--changeset shubham_singh:store_unit_capacity_soft_constraint_1 stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels:MTP-96837-1
--comment: revert updated datatype of updated_at column
ALTER TABLE inventory_smart.store_unit_capacity
ALTER COLUMN updated_at TYPE timestamp;

