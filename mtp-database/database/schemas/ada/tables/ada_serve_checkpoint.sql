--liquibase formatted sql
--changeset akul.rattan@impactanalytics.co:ada_serve_checkpoint stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for ada_serve_checkpoint

CREATE TABLE IF NOT EXISTS "ada".ada_serve_checkpoint (
	checkpoint_code serial4 NOT NULL,
	request_code int4 NOT NULL,
	product_codes varchar NULL,
	pg_code varchar NULL,
	hierarchy_code varchar NULL,
	forecast_level varchar NULL,
	training_category varchar NOT NULL,
	training_sub_category varchar NOT NULL,
	model_url varchar NOT NULL,
	lower_level_split_model_url varchar NULL,
	status varchar NOT NULL DEFAULT 'PENDING'::character varying,
	message text NULL,
	hierarchy_level varchar NULL,
	feature_configuration jsonb NULL,
	from_date date NULL,
	to_date date NULL,
	time_level varchar NULL,
	tag jsonb NULL,
	CONSTRAINT ada_serve_checkpoint_pkey PRIMARY KEY (checkpoint_code)
);
ALTER TABLE "ada".ada_serve_checkpoint ADD CONSTRAINT request_code_fk FOREIGN KEY (request_code) REFERENCES "ada".ada_serve_request(request_code) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS ada_serve_checkpoint_request_code_idx ON "ada".ada_serve_checkpoint USING btree(request_code);
CREATE INDEX IF NOT EXISTS ada_serve_checkpoint_checkpoint_code_idx ON "ada".ada_serve_checkpoint USING btree(checkpoint_code);


