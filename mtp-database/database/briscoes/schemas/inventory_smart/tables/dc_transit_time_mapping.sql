--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:dc_transit_time_mapping stripComments:false splitStatements:false context:Release_1_0 labels:briscoes_dc_transit_time_mapping
--comment: initial changeset for dc_transit_time_mapping

CREATE TABLE if NOT exists inventory_smart.dc_transit_time_mapping (
	mapping_code int4 NOT NULL,
	transit_time float4 NOT NULL,
	priority int4 NULL,
	CONSTRAINT dc_transit_time_mapping_un UNIQUE (mapping_code, transit_time),
	CONSTRAINT dc_store_fk FOREIGN KEY (mapping_code) REFERENCES "global".product_mapping_store_dc(mapping_code) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX dc_transit_time_mapping_mapping_code_idx ON inventory_smart.dc_transit_time_mapping USING btree (mapping_code);

--changeset samarjit.mazumder@impactanalytics.co:modified_dc_store_fk_constraint stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_modified_dc_store_fk_constraint
--comment: modified_dc_store_fk_constraint
ALTER TABLE inventory_smart.dc_transit_time_mapping DROP CONSTRAINT IF EXISTS dc_store_fk;
ALTER TABLE inventory_smart.dc_transit_time_mapping ADD CONSTRAINT dc_store_fk FOREIGN KEY (mapping_code)
REFERENCES "global".product_mapping_store_dc (mapping_code) ON DELETE CASCADE;
