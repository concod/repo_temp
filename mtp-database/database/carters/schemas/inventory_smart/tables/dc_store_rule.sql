--liquibase formatted sql
--changeset liquibase:dc_store_rule stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: MTP-38504 DC To Store Rule table - to store the client specific dc to to store rules.
CREATE TABLE inventory_smart.dc_store_rule (
	id serial4 NOT NULL,
	rule_config_id int4,
	"name" varchar NOT NULL,
	"display_name" varchar not null,
	strategy varchar NOT NULL,
	is_default bool DEFAULT false NOT NULL,
	created_by int4 NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NULL,
	updated_by int4 NULL,
	is_deleted bool DEFAULT false NOT NULL,
	CONSTRAINT dc_store_rule_pk PRIMARY KEY (id),
	CONSTRAINT dc_store_rule_name_unique UNIQUE (name),
	CONSTRAINT dc_store_rule_configuration_created_by_fk FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL,
	CONSTRAINT dc_store_rule_configuration_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL
);
