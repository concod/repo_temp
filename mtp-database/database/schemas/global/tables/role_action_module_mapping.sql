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

--changeset ashish:role_action_module_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: modified the primary key to include id column
ALTER TABLE global.role_action_module_mapping ADD COLUMN id serial4 PRIMARY KEY;

--changeset srishti.kumari:role_action_module_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: drop existing primary key
ALTER TABLE global.role_action_module_mapping DROP CONSTRAINT IF EXISTS role_action_module_mapping_pk;
ALTER TABLE global.role_action_module_mapping DROP CONSTRAINT IF EXISTS role_action_module_mapping_pkey;
ALTER TABLE global.role_action_module_mapping ADD COLUMN IF NOT EXISTS id serial4;
ALTER TABLE global.role_action_module_mapping ADD CONSTRAINT role_action_module_mapping_pkey PRIMARY KEY (id);