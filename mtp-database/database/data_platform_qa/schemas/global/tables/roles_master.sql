--liquibase formatted sql
--changeset liquibase:roles_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for roles_master

CREATE TABLE "global".roles_master (
	role_code serial4 NOT NULL,
	"name" varchar NOT NULL,
	status bool NOT NULL DEFAULT true,
	action_code _int4 NULL,
	CONSTRAINT roles_master_pk PRIMARY KEY (role_code)
);
CREATE UNIQUE INDEX roles_master_uk ON global.roles_master USING btree (lower((name)::text));
