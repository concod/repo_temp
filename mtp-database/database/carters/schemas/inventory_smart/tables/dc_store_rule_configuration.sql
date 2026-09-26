--liquibase formatted sql
--changeset liquibase:dc_store_rule_configuration stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: MTP-38504 dc_store_rule_configuration table - Used to store all the support dc to store strategy configuration. these configuration will be used to create the dc to store rule.
CREATE TABLE inventory_smart.dc_store_rule_configuration (
	id serial4 NOT NULL,
	"name" varchar NOT NULL,
	"display_name" varchar NOT NULL,
	strategy jsonb NOT NULL DEFAULT '{}'::jsonb,
 	status bool DEFAULT true NULL,
	created_by int4 NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NULL,
	updated_by int4 NULL,
	is_deleted bool DEFAULT false NOT NULL,
	CONSTRAINT dc_store_rule_configuration_pk PRIMARY KEY (id),
	CONSTRAINT dc_store_rule_configuration_name_unique UNIQUE (name),
	CONSTRAINT dc_store_rule_configuration_created_by_fk FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL,
	CONSTRAINT dc_store_rule_configuration_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL
);
