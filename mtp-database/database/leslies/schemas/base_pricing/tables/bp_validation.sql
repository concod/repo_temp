--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_validation_10 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_validation_10

CREATE TABLE base_pricing.bp_validation (
	validation_id int4 NOT NULL,
	validation_code varchar(50) NOT NULL,
	validation_name varchar(100) NOT NULL,
	validation_condition text NULL,
	validation_message text NOT NULL,
	validation_category varchar(50) NOT NULL,
	validation_type varchar(20) NOT NULL,
	validation_module varchar(50) NOT NULL,
	validation_params jsonb DEFAULT '{}'::jsonb NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT bp_validation_pkey PRIMARY KEY (validation_id),
	CONSTRAINT bp_validation_validation_code_key UNIQUE (validation_code),
	CONSTRAINT bp_validation_validation_type_check CHECK (((validation_type)::text = ANY ((ARRAY['validate'::character varying, 'transform'::character varying])::text[])))
);
CREATE INDEX bp_validation_module_active_idx ON base_pricing.bp_validation USING btree (validation_module, is_active);
CREATE INDEX bp_validation_validation_code_idx ON base_pricing.bp_validation USING btree (validation_code);
CREATE INDEX bp_validation_validation_id_idx ON base_pricing.bp_validation USING btree (validation_id);