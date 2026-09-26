--liquibase formatted sql
--changeset liquibase:users_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for users - added serial 4
CREATE TABLE um.users (
	id serial4 NOT NULL,
	"password" varchar(128) NOT NULL,
	last_login timestamptz NULL,
	is_superuser bool NOT NULL,
	email varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	is_active bool NOT NULL,
	is_staff bool NOT NULL,
	created_at timestamptz NULL,
	updated_at timestamptz NULL,
	"attributes" varchar(255) NOT NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	default_values jsonb NULL,
	login_type int2 NOT NULL DEFAULT 0,
	CONSTRAINT users_email_key UNIQUE (email),
	CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE INDEX users_email_0ea73cca_like ON um.users USING btree (email varchar_pattern_ops);