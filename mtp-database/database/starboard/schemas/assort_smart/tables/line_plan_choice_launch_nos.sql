--liquibase formatted sql
--changeset srinivasgowda:line_plan_choice_launch_nos stripComments:false splitStatements:false context:Create_table labels:liquibase_project_start
--comment: initial changeset for line_plan_choice_launch_nos

CREATE TABLE assort_smart.line_plan_choice_launch_nos (
	id serial4 NOT NULL,
	hierarchy_code varchar NOT NULL,
	season_code varchar NULL,
	placeholder_choice_id varchar NOT NULL,
	placeholder_style_id varchar NOT NULL,
	launch varchar NULL,
	channel varchar NOT NULL,
	sub_channel varchar NOT NULL,
	final_level varchar NOT NULL,
	total_inv_units jsonb NULL,
	sales_units jsonb NULL,
	receipt_units jsonb NULL,
	receipts_price_per_unit jsonb NULL,
	aps jsonb NULL,
	sales jsonb NULL,
	receipts jsonb NULL,
	st jsonb NULL,
	avg_wk_cnt jsonb NULL,
	gross_margin jsonb NULL,
	aur jsonb NULL,
	air jsonb NULL,
	aic jsonb NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	season_name varchar(50) NULL,
	CONSTRAINT line_plan_choice_launch_nos_pkey PRIMARY KEY (id)
);