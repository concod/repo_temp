--liquibase formatted sql
--changeset gauri.nair@impactanalytics.co:dc_transit_time_mapping_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts_1
--comment: initial changeset for dc_transit_time_mapping_1
CREATE TABLE if not exists inventory_smart.dc_transit_time_mapping (
	mapping_code int4 NOT NULL,
	transit_time float4 NOT NULL,
	CONSTRAINT dc_transit_time_mapping_un UNIQUE (mapping_code, transit_time),
	CONSTRAINT dc_store_fk FOREIGN KEY (mapping_code) REFERENCES "global".product_mapping_store_dc(mapping_code) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX if not exists dc_transit_time_mapping_mapping_code_idx ON inventory_smart.dc_transit_time_mapping USING btree (mapping_code);

--changeset gauri.nair@impactanalytics.co:dc_transit_time_mapping_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts_v2
--comment: alter table changeset for dc_transit_time_mapping_v2
alter table inventory_smart.dc_transit_time_mapping add column if not exists priority int4;