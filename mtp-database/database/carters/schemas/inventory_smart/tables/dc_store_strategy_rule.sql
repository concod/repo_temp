 --liquibase formatted sql
--changeset liquibase:dc_store_strategy_rule stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: MTP-38504 dc_store_strategy_rule - Used to store the dc to store strategy rule created by using the dc to store rules.
 CREATE TABLE inventory_smart.dc_store_strategy_rule (
	id serial4 NOT NULL,
	"name" varchar NOT NULL,
	rule_def  jsonb NOT NULL,
	is_default bool DEFAULT false NULL,
	created_by int4 NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NULL,
	updated_by int4 NULL,
	is_deleted bool DEFAULT false NOT NULL,
	CONSTRAINT dc_store_strategy_pk PRIMARY KEY (id),
	CONSTRAINT dc_store_strategy_name_unique UNIQUE (name),
	CONSTRAINT dc_store_rule_configuration_created_by_fk FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL,
	CONSTRAINT dc_store_rule_configuration_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL
);
