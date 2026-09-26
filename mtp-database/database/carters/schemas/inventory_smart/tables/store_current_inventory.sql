--liquibase formatted sql
--changeset liquibase:store_current_inventory stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_current_inventory

CREATE TABLE inventory_smart.store_current_inventory (
	store_code varchar NOT NULL,
	total_inv float4 NULL,
	CONSTRAINT store_current_inventory_store_code_key UNIQUE (store_code)   
);

--changeset shameel.zeshan@impactanalytics.co:store_current_inventory_new_cols stripComments:false splitStatements:false labels:store_current_inventory_new_cols
--comment: adding oh and it columns
ALTER TABLE inventory_smart.store_current_inventory ADD COLUMN IF NOT EXISTS oh float4 NULL ;
ALTER TABLE inventory_smart.store_current_inventory ADD COLUMN IF NOT EXISTS it float4 NULL ;