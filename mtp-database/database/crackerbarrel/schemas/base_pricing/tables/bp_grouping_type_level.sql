--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_grouping_type_level stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_grouping_type_level

CREATE TABLE base_pricing.bp_grouping_type_level (
	grouping_type_level_id int2 NOT NULL,
	grouping_type_level_value varchar(255) NOT NULL,
	CONSTRAINT bp_grouping_type_level_pkey PRIMARY KEY (grouping_type_level_id)
);