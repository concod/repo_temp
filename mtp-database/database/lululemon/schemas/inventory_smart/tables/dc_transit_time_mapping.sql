--liquibase formatted sql
--changeset liquibase:dc_transit_time_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dc_transit_time_mapping

CREATE TABLE IF NOT EXISTS  inventory_smart.dc_transit_time_mapping (
	mapping_code INT4 NOT NULL,
	transit_time FLOAT4 NOT NULL,
	CONSTRAINT dc_transit_time_mapping_un UNIQUE (mapping_code, transit_time),
	CONSTRAINT dc_store_fk FOREIGN KEY (mapping_code) 
		REFERENCES "global".product_mapping_store_dc(mapping_code) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX dc_transit_time_mapping_mapping_code_idx 
	ON inventory_smart.dc_transit_time_mapping USING btree (mapping_code);

--changeset aniruddh.singh@impactanalytics.co:dc_transit_time_mapping_add_priority stripComments:false splitStatements:false context:Release_1_0
--comment: Add priority column to dc_transit_time_mapping
ALTER TABLE inventory_smart.dc_transit_time_mapping
ADD COLUMN IF NOT EXISTS priority INT4 DEFAULT 1;
