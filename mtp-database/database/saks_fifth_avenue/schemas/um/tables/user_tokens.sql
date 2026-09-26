--liquibase formatted sql
--changeset liquibase:user_tokens_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for user_tokens - added serial 4
CREATE TABLE um.user_tokens (
	id serial4 NOT NULL,
	"token" varchar NOT NULL,
	valid_until timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP + '1 day'::interval day,
	user_id int4 NULL,
	created_at timestamptz NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at timestamptz NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	status int2 NULL,
	CONSTRAINT user_tokens_pkey PRIMARY KEY (id),
	CONSTRAINT user_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES um.users(id) ON DELETE CASCADE
);
CREATE INDEX user_tokens_token_idx ON um.user_tokens USING btree (token);