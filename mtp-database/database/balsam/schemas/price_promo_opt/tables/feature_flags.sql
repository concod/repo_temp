--liquibase formatted sql
--changeset liquibase:feature_flags stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for feature_flags

CREATE TABLE price_promo_opt.feature_flags (
	id serial4 NOT NULL,
	"name" text NOT NULL,
	description text NULL,
	is_enabled bool DEFAULT false NOT NULL,
	context jsonb NULL,
	created_at timestamp DEFAULT now() NULL,
	updated_at timestamp DEFAULT now() NULL,
	CONSTRAINT feature_flags_name_key UNIQUE (name),
	CONSTRAINT feature_flags_pkey PRIMARY KEY (id)
);