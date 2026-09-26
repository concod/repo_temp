--liquibase formatted sql
--changeset hemanth.cs@impactanalytics.co:assort_smart.line_arch_store_week_add_not_exists stripComments:false splitStatements:false context:MTP-75018 labels:initial_changeset
--comment: initial changeset for line_arch_store_week

-- DROP TABLE assort_smart.line_arch_store_week;
CREATE TABLE IF NOT EXISTS assort_smart.line_arch_store_week (
	id bigserial NOT NULL,
	plan_code int4 NOT NULL,
	hierarchy_code varchar NOT NULL,
	final_level varchar NOT NULL,
	channel int4 NOT NULL,
	sub_channel int4 NOT NULL,
	gender varchar NULL,
	season_code varchar NULL,
	launch_season varchar NULL,
	placeholder_choice_id varchar NOT NULL,
	choice_id varchar NULL,
	placeholder_style_id varchar NOT NULL,
	image_name_url varchar NULL,
	style_id varchar NULL,
	color_id varchar NULL,
	cluster_code varchar NULL,
	cluster_display_name varchar NULL,
	store_code varchar NULL,
	all_store_flag bool NULL,
	launch varchar NULL,
	launch_start_date date NULL,
	delivery_start_date date NULL,
	delivery varchar NULL,
	fiscal_month int4 NULL,
	fiscal_week int4 NULL,
	launch_delivery_perc float8 DEFAULT 0.0 NULL,
	flow_cluster_perc float8 DEFAULT 0.0 NULL,
	cluster_store_perc float8 DEFAULT 0.0 NULL,
	sales_units float8 DEFAULT 0.0 NULL,
	sales float8 DEFAULT 0.0 NULL,
	receipt_units float8 DEFAULT 0.0 NULL,
	receipts float8 DEFAULT 0.0 NULL,
	st float8 DEFAULT 0.0 NULL,
	aur float8 DEFAULT 0.0 NULL,
	receipts_price_per_unit float8 DEFAULT 0.0 NULL,
	is_deleted bool DEFAULT false NULL,
	color_name varchar NULL,
	style_name varchar NULL,
	CONSTRAINT line_arch_store_week_pkey PRIMARY KEY (final_level, id)
)
PARTITION BY LIST (final_level);

--changeset hemanth.cs@impactanalytics.co:assort_smart.line_arch_store_week_style_tag_col stripComments:false splitStatements:false context:MTP-87204 labels:update_changeset
--comment: update changeset for line_arch_store_week to add style_tag column
ALTER TABLE assort_smart.line_arch_store_week
ADD COLUMN style_tag varchar NULL;

--changeset hemanth.cs@impactanalytics.co:assort_smart.line_arch_store_week_store_week_perc_col stripComments:false splitStatements:false context:MTP-97774 labels:update_changeset
--comment: update changeset for line_arch_store_week to add store_week_perc column
ALTER TABLE assort_smart.line_arch_store_week
ADD COLUMN IF NOT EXISTS store_week_perc float8 DEFAULT 0.0 NULL;

--changeset hemanth.cs@impactanalytics.co:assort_smart.line_arch_store_week_min_max_col stripComments:false splitStatements:false context:MTP-103954 labels:update_changeset
--comment: update changeset for line_arch_store_week to add min max column
ALTER TABLE assort_smart.line_arch_store_week
ADD COLUMN IF NOT EXISTS min_value float8 DEFAULT 0.0 NULL,
ADD COLUMN IF NOT EXISTS max_value float8 DEFAULT 0.0 NULL; 