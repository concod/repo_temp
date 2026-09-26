--liquibase formatted sql
--changeset sreevathsa.sp@impactanalytics.co:dc_transit_time_mapping_2 stripComments:false splitStatements:false context:Release_1_0 labels:pacsun_dc_transit_time_mapping
--comment: initial changeset for dc_transit_time_mapping_1

CREATE TABLE if not exists inventory_smart.dc_transit_time_mapping (
	mapping_code int4 NOT NULL,
	transit_time float4 NOT NULL,
	CONSTRAINT dc_transit_time_mapping_un UNIQUE (mapping_code, transit_time),
	CONSTRAINT dc_store_fk FOREIGN KEY (mapping_code) REFERENCES "global".product_mapping_store_dc(mapping_code) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX if not exists dc_transit_time_mapping_mapping_code_idx ON inventory_smart.dc_transit_time_mapping USING btree (mapping_code);


--changeset sreevathsa.sp@impactanalytics.co:add_dc_transit_time_mapping_columns_2 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:pacsun_add_dc_transit_time_mapping_columns
--comment: add_dc_transit_time_mapping_columns
ALTER TABLE inventory_smart.dc_transit_time_mapping ADD COLUMN IF NOT EXISTS "priority" int4 NULL;
ALTER TABLE inventory_smart.dc_transit_time_mapping ADD COLUMN IF NOT EXISTS processing_time int4 NULL;