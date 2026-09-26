--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_zones_10 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_zones_10

CREATE TABLE base_pricing.bp_zones (
	zone_id serial4 NOT NULL,
	zone_name varchar(100) NOT NULL,
	zone_structure_id int4 NOT NULL,
	active bool DEFAULT true NULL,
	CONSTRAINT bp_zones_pkey PRIMARY KEY (zone_id),
	CONSTRAINT bp_zones_zone_name_zone_structure_id_key UNIQUE (zone_name, zone_structure_id),
	CONSTRAINT bp_zones_zone_structure_id_fkey FOREIGN KEY (zone_structure_id) REFERENCES base_pricing.bp_zone_structure(zone_structure_id) ON DELETE CASCADE
);