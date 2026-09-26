--liquibase formatted sql
--changeset akul.rattan@impactanalytics.co:ada_serve_request stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for ada_serve_request

CREATE TABLE "ada".ada_serve_request (
	request_code serial4 NOT NULL,
	product_codes _varchar NULL,
	start_date date NOT NULL,
	end_date date NOT NULL,
	status varchar NOT NULL,
	message text NULL,
	feature_configuration jsonb NULL,
	created_by int4 NOT NULL,
	created_at timestamptz NOT NULL,
	callback jsonb NULL,
	time_level varchar NULL,
	category varchar NULL,
	hierarchy_codes _varchar NULL,
	forecast_level varchar NULL,
	hierarchy_level varchar NULL,
	tag jsonb NULL,
	pg_codes _varchar NULL,
	CONSTRAINT ada_serve_request_pkey PRIMARY KEY (request_code),
    CONSTRAINT user_fk FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL
);


