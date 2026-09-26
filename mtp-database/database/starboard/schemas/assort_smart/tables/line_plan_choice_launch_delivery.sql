--liquibase formatted sql
--changeset rishabh.swarnkar@impactanalytics.co:assort_smart.line_plan_choice_launch_delivery stripComments:false splitStatements:false context:MTP-75018 labels:initial_changeset
--comment: initial changeset for line_plan_choice_launch_delivery

-- DROP TABLE assort_smart.line_plan_choice_launch_delivery;

CREATE TABLE IF NOT EXISTS assort_smart.line_plan_choice_launch_delivery (
	plan_choice_launch_delivery_id bigserial NOT NULL,
	plan_code int4 NOT NULL,
	hierarchy_code varchar NOT NULL,
	final_level varchar NOT NULL,
	channel int4 NOT NULL,
	sub_channel int4 NOT NULL,
	gender varchar NULL,
	season_code varchar NULL,
	placeholder_choice_id varchar NOT NULL,
	placeholder_style_id varchar NOT NULL,
	style_id varchar NULL,
	color_id varchar NULL,
	style_name varchar NULL,
	color_name varchar NULL,
	clearance_date date NULL,
	launch varchar NULL,
	launch_start_date date NULL,
	delivery_start_date date NULL,
	delivery varchar NULL,
	launch_delivery_perc float8 DEFAULT 0.0 NULL,
	receipt_units float8 DEFAULT 0.0 NULL,
	receipts float8 DEFAULT 0.0 NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	style_tag varchar DEFAULT 'New'::character varying NULL,
	nrf_color_bucket varchar NULL,
	on_floor_date varchar NULL,
	style_color varchar NULL,
	CONSTRAINT line_plan_choice_launch_delivery_pkey PRIMARY KEY (plan_choice_launch_delivery_id)
);
CREATE INDEX IF NOT EXISTS line_plan_choice_launch_delivery_plan_final_level_idx ON assort_smart.line_plan_choice_launch_delivery USING btree (plan_code, final_level);