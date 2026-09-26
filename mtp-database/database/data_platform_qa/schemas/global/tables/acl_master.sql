--liquibase formatted sql
--changeset liquibase:acl_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for acl_master
CREATE TABLE "global".acl_master (
	acl_code serial4 NOT NULL,
	role_code int4 NULL,
	application_code int4 NULL,
	screen_code int4 NULL,
	status bool NOT NULL DEFAULT true,
	CONSTRAINT acl_master_pk PRIMARY KEY (acl_code)
);
ALTER TABLE "global".acl_master ADD CONSTRAINT acl_master_fk FOREIGN KEY (application_code) REFERENCES "global".application_master(application_code);
ALTER TABLE "global".acl_master ADD CONSTRAINT acl_master_screen_fk FOREIGN KEY (screen_code) REFERENCES "global".screen_master(screen_code);
ALTER TABLE "global".acl_master ADD CONSTRAINT acl_master_role_fk FOREIGN KEY (role_code) REFERENCES "global".roles_master(role_code);
ALTER TABLE "global".acl_master ADD CONSTRAINT acl_master_un UNIQUE (role_code,application_code,screen_code);
