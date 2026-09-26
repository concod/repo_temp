--liquibase formatted sql
--changeset liquibase:role_master_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for role_master - added serial 4
CREATE TABLE um.role_master (
	role_id serial4 NOT NULL,
	role_name varchar NOT NULL,
	created_at timestamptz NULL DEFAULT now(),
	updated_at timestamptz NULL DEFAULT now(),
	CONSTRAINT roles_pk PRIMARY KEY (role_id)
);