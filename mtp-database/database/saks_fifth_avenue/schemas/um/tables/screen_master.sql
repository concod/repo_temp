--liquibase formatted sql
--changeset liquibase:screen_master_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for screen_master - added serial 4
CREATE TABLE um.screen_master (
	screen_id serial4 NOT NULL,
	screen_name varchar NOT NULL,
	screen_desc varchar NULL,
	created_at timestamptz NULL DEFAULT now(),
	updated_at timestamptz NULL DEFAULT now(),
	CONSTRAINT screen_master_pk PRIMARY KEY (screen_id)
);