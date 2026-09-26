--liquibase formatted sql
--changeset liquibase:role_action_module_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for role_action_module_mapping
CREATE TABLE "global".role_action_module_mapping (
	role_code int4 NOT NULL,
	action_code _int4 NOT NULL,
	is_superuser bool NOT NULL,
	module_code _int4 NOT NULL
);
ALTER TABLE "global".role_action_module_mapping ADD CONSTRAINT role_action_module_mapping_fk FOREIGN KEY (role_code) REFERENCES "global".roles_master(role_code);
