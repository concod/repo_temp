--liquibase formatted sql
--changeset liquibase:dc_transit_time_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dc_transit_time_mapping
CREATE TABLE inventory_smart.dc_transit_time_mapping (
	mapping_code int4 NOT NULL,
	transit_time float4 NOT NULL,
	CONSTRAINT dc_transit_time_mapping_un UNIQUE (mapping_code, transit_time)
);
CREATE UNIQUE INDEX dc_transit_time_mapping_mapping_code_idx ON inventory_smart.dc_transit_time_mapping USING btree (mapping_code);
ALTER TABLE inventory_smart.dc_transit_time_mapping ADD CONSTRAINT dc_store_fk FOREIGN KEY (mapping_code) REFERENCES "global".product_mapping_store_dc(mapping_code) ON DELETE RESTRICT;

--changeset rajat.choudhary-01 liquibase:dc_transit_time_mapping stripComments:false splitStatements:false context:Release_1_0 labels:01
--comment: changing the foreign key constraint for dc_transit_time_mapping
ALTER TABLE inventory_smart.dc_transit_time_mapping DROP CONSTRAINT dc_store_fk ;
ALTER TABLE inventory_smart.dc_transit_time_mapping ADD CONSTRAINT dc_store_fk FOREIGN KEY (mapping_code) REFERENCES "global".product_mapping_store_dc(mapping_code) ON DELETE CASCADE;

