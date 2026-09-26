--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_screen_hierarchies_10 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_screen_hierarchies_10


CREATE TABLE base_pricing.bp_screen_hierarchies (
	screen_id int4 NOT NULL,
	screen_name varchar(255) NOT NULL,
	hierarchies jsonb NOT NULL,
	CONSTRAINT bp_screen_hierarchies_pkey PRIMARY KEY (screen_id)
);