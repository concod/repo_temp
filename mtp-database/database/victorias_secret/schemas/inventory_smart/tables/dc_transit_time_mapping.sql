--liquibase formatted sql
--changeset liquibase:dc_transit_time_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dc_transit_time_mapping
CREATE TABLE inventory_smart.dc_transit_time_mapping (
	mapping_code int4 NOT NULL,
	transit_time float4 NOT NULL,
	dc_rank int2 NULL DEFAULT 1,
	CONSTRAINT dc_transit_time_mapping_un UNIQUE (mapping_code, transit_time)
);
CREATE UNIQUE INDEX dc_transit_time_mapping_mapping_code_idx ON inventory_smart.dc_transit_time_mapping USING btree (mapping_code);
ALTER TABLE inventory_smart.dc_transit_time_mapping ADD CONSTRAINT dc_store_fk FOREIGN KEY (mapping_code) REFERENCES "global".product_mapping_store_dc(mapping_code) ON DELETE RESTRICT;

--changeset rajesh.karunanidhi:dc_transit_time_mapping stripComments:false splitStatements:false context:MTP-19015 labels:MTP-19015
--comment: added updated_at and updated_by to dc_transit_time_mapping

ALTER TABLE inventory_smart.dc_transit_time_mapping ADD updated_at timestamptz NULL;
ALTER TABLE inventory_smart.dc_transit_time_mapping ADD updated_by int4 NULL;
ALTER TABLE inventory_smart.dc_transit_time_mapping ADD CONSTRAINT dc_transit_time_mapping_updated_by_fk FOREIGN KEY (updated_by) REFERENCES global.user_master(user_code) ON DELETE SET NULL;

--changeset mayank.dubey@impactanalytics.co:dc_transit_time_mapping stripComments:false splitStatements:false context:MTP-19015 labels:liquibase_project_start
--comment: add processing_time column

ALTER TABLE inventory_smart.dc_transit_time_mapping ADD processing_time float4 NULL;

--changeset mayank.dubey@impactanalytics.co:dc_transit_time_mapping_v2 stripComments:false splitStatements:false context:MTP-19015 labels:liquibase_project_start
--comment: drop null constraint from transit_time column

ALTER TABLE inventory_smart.dc_transit_time_mapping alter column transit_time drop not null;

--changeset mayank.dubey@impactanalytics.co:dc_transit_time_mapping_v3 stripComments:false splitStatements:false context:MTP-19015 labels:liquibase_project_start
--comment: add transit_time_og column

ALTER TABLE inventory_smart.dc_transit_time_mapping ADD transit_time_og float4 NULL;

--changeset kamuju.mahaveer@impactanalytics.co:dc_transit_time_mapping_v4 stripComments:false splitStatements:false context:VS_schema_requirement  labels:VPP-310
--comment: add shipping_mode column

ALTER TABLE inventory_smart.dc_transit_time_mapping ADD shipping_mode varchar NULL;


--changeset kamuju.mahaveer@impactanalytics.co:dc_transit_time_mapping_v5 stripComments:false splitStatements:false context:VS_inv_smart labels:VPP-336
--comment: Updated Schema based on Alignment with product and DB team
ALTER TABLE inventory_smart.dc_transit_time_mapping RENAME COLUMN dc_rank to priority ;
ALTER TABLE inventory_smart.dc_transit_time_mapping DROP COLUMN updated_at ;
ALTER TABLE inventory_smart.dc_transit_time_mapping DROP COLUMN updated_by ;
ALTER TABLE inventory_smart.dc_transit_time_mapping DROP COLUMN transit_time_og ;
ALTER TABLE inventory_smart.dc_transit_time_mapping DROP COLUMN processing_time ;

