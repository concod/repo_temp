
--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_store_zone_mapping_v2 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_store_zone_mapping_v2

CREATE TABLE base_pricing.bp_store_zone_mapping (
	mapping_id serial4 NOT NULL,
	store_id int4 NOT NULL,
	zone_id int4 NOT NULL,
	zone_structure_id int4 NOT NULL,
	CONSTRAINT bp_store_zone_mapping_pkey PRIMARY KEY (mapping_id),
	CONSTRAINT bp_store_zone_mapping_store_id_zone_id_zone_structure_id_key UNIQUE (store_id, zone_structure_id),
	CONSTRAINT bp_store_zone_mapping_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES base_pricing.bp_zones(zone_id) ON DELETE CASCADE,
	CONSTRAINT bp_store_zone_mapping_zone_structure_id_fkey FOREIGN KEY (zone_structure_id) REFERENCES base_pricing.bp_zone_structure(zone_structure_id) ON DELETE CASCADE
);