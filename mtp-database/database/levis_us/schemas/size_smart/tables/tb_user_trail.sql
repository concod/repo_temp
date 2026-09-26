--liquibase formatted sql
--changeset akashkumar.rana@impactanalytics.co:tb_user_trail stripComments:false splitStatements:false context:tb_user_trail labels:tb_user_trail
--comment: added tb_user_trail table



CREATE TABLE size_smart.tb_user_trail (
	id bigserial NOT NULL,
	module varchar(255) NULL,
	sub_module varchar(255) NULL,
	action varchar(255) NULL,
	payload jsonb NULL,
	planning_group varchar(255) null,
	style_color TEXT[],
	user_id int4 NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	user_email text NULL,
	api text NOT NULL,
	status_code int2 NULL,
	http_method varchar(10) NULL,
	PRIMARY KEY (created_at, id)
);