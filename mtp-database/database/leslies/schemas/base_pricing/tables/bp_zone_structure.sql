--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_zone_structure_10 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_zone_structure_10

CREATE TABLE base_pricing.bp_zone_structure (
	zone_structure_id serial4 NOT NULL,
	structure_name varchar(100) NOT NULL,
	active bool DEFAULT true NULL,
	input_type varchar NULL,
	CONSTRAINT bp_zone_structure_pkey PRIMARY KEY (zone_structure_id),
	CONSTRAINT bp_zone_structure_structure_name_key UNIQUE (structure_name)
);