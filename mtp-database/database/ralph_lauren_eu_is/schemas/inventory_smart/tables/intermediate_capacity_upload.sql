--liquibase formatted sql
--changeset liquibase:ajun_ravi_store_code_made_unique stripComments:false splitStatements:false context:MTP-34246 labels:MTP-34246
--comment: ajun_ravi_store_code_made_unique
CREATE TABLE IF NOT EXISTS inventory_smart.intermediate_capacity_upload (
	product_hierarchy varchar NULL,
	store_code varchar NOT NULL,
	unit_capacity float4 NULL,
	receipt_capacity float4 NULL,
	carton_capacity float4 NULL,
	updated_at timestamptz NULL,
	updated_by int NULL,
	child_id text NULL
);



--changeset ajunravi.impact:store_code_made_unique stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels: MTP-34236
--comment: store_code made as unique
ALTER TABLE inventory_smart.intermediate_capacity_upload ADD CONSTRAINT store_code PRIMARY KEY (store_code);

--changeset adeshkumar:intermediate_capacity_upload-2 stripComments:false splitStatements:false context:MTP-34246 labels:MTP-34246
--comment: add column for intermediate_capacity_upload
ALTER TABLE inventory_smart.intermediate_capacity_upload add column if not exists file_id text NULL;

--changeset konakandla.sujan@impactanalytics.co:delete column stripComments:false splitStatements:false context:MTP-61008 labels:MTP-61008
--comment Add delete column
ALTER TABLE inventory_smart.intermediate_capacity_upload ADD "delete" float4 NULL;

--changeset konakandla.sujan@impactanalytics.co:remove store_code constraint stripComments:false splitStatements:false context:MTP-61008 labels:MTP-61008
--comment remove store_code constraint 
ALTER TABLE inventory_smart.intermediate_capacity_upload drop constraint if exists store_code;