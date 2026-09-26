--liquibase formatted sql
--changeset liquibase:event_master_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for event_master - added serial 4
CREATE TABLE price_promo.event_master (
	event_id serial4 NOT NULL,
	event_code bpchar(10) NULL,
	campaign_id int4 NULL,
	"name" text NOT NULL,
	start_date date NOT NULL,
	end_date date NOT NULL,
	customer_segment varchar(100) NULL,
	description text NULL,
	channel varchar(100) NULL,
	marketing_channel varchar(100) NULL DEFAULT 0,
	status int2 NOT NULL DEFAULT 0,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NULL DEFAULT now(),
	created_by int4 NOT NULL DEFAULT 0,
	updated_by int4 NULL DEFAULT 0,
	is_deleted int2 NOT NULL DEFAULT 0,
	submit_offer_by date NULL,
	marketing_notes text NULL,
	event_type text NULL,
	event_objective text NULL,
	event_objective_description text NULL,
	event_offer_type_id int4 NULL,
	ad_type int8 NULL DEFAULT 1,
	channel_type int8 NULL DEFAULT 23,
	min_percent_value float8 NULL DEFAULT 0,
	CONSTRAINT const_uk_event_name UNIQUE (name),
	CONSTRAINT event_master_pkey PRIMARY KEY (event_id)
);