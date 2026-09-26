-- liquibase formatted sql
-- changeset akashkumar.rana@impactanalytics.co:tb_size_buy_output_modifications stripComments:false splitStatements:false context:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS labels:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS 
-- comment: initial changeset for tb_size_buy_output


CREATE TABLE size_smart.tb_size_buy_output (
	id serial4 NOT NULL,
	plan_code int4 NOT NULL,
	style_color varchar NOT NULL,
	size_dist jsonb NULL,
	store varchar NOT NULL,
	size_profile_id int4 NULL,
	buy_units numeric NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	size_grid_id int4 NOT NULL,
	size_grid_name varchar NOT NULL,
	"level" varchar NOT NULL,
	floorset_date date NULL,
	season_code int4 NULL,
	size_style_dist jsonb NULL,
	status varchar NULL,
	CONSTRAINT tb_size_buy_output_pkey PRIMARY KEY (id),
	CONSTRAINT tb_size_buy_output_uq_style_store UNIQUE (style_color, store, plan_code)
);
CREATE INDEX idx_tb_size_buy_output_plan_code ON size_smart.tb_size_buy_output USING btree (plan_code);