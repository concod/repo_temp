--liquibase formatted sql
--changeset liquibase:action_master_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for action_master - added serial 4
CREATE TABLE um.action_master (
	action_id serial4 NOT NULL,
	action_name varchar NOT NULL,
	action_desc varchar NULL,
	created_at timestamptz NULL DEFAULT now(),
	updated_at timestamptz NULL DEFAULT now(),
	CONSTRAINT action_master_pk PRIMARY KEY (action_id)
);
