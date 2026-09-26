
--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:dc_transit_time_mapping stripComments:false splitStatements:false context:Release_1_0 labels:sm_liquibase_project_start
--comment: initial changeset for dc_transit_time_mapping
CREATE TABLE IF NOT EXISTS inventory_smart.dc_transit_time_mapping (
    mapping_code int4 NOT NULL,
    transit_time float4 NOT NULL,
    CONSTRAINT dc_transit_time_mapping_un UNIQUE (mapping_code, transit_time),
    CONSTRAINT dc_store_fk FOREIGN KEY (mapping_code) REFERENCES "global".product_mapping_store_dc(mapping_code) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS dc_transit_time_mapping_mapping_code_idx 
ON inventory_smart.dc_transit_time_mapping USING btree (mapping_code);

--changeset samarjit.mazumder@impactanalytics.co:dc_transit_time_mapping stripComments:false splitStatements:false context:MTP-26840 labels:priority
--comment: add dc_rank column
ALTER TABLE inventory_smart.dc_transit_time_mapping ADD COLUMN IF NOT EXISTS dc_rank int2 DEFAULT 1 NULL;
