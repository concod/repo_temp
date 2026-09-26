--liquibase formatted sql
--changeset liquibase:dc_transit_time_mapping_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dc_transit_time_mapping
CREATE TABLE IF NOT EXISTS inventory_smart.dc_transit_time_mapping (
	mapping_code int4 NOT NULL,
	transit_time float4 NOT NULL,
	CONSTRAINT dc_transit_time_mapping_un UNIQUE (mapping_code, transit_time)
);
CREATE UNIQUE INDEX dc_transit_time_mapping_mapping_code_idx ON inventory_smart.dc_transit_time_mapping USING btree (mapping_code);
ALTER TABLE inventory_smart.dc_transit_time_mapping ADD CONSTRAINT dc_store_fk FOREIGN KEY (mapping_code) REFERENCES "global".product_mapping_store_dc(mapping_code) ON DELETE CASCADE;


--changeset abhishek.sagar@impactanalytics.co:dc_reserve_quantity_figs stripComments:false splitStatements:false context:columns_add labels:col-addition
--comment: added columns

ALTER TABLE inventory_smart.dc_transit_time_mapping  
			ADD COLUMN IF NOT EXISTS priority int4 NULL;

