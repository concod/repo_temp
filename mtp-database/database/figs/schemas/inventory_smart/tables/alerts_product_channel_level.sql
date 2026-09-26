--liquibase formatted sql
--changeset abhishek.sagar@impactanalytics.co:alerts_product_channel_level_figs stripComments:false splitStatements:false context:VS_inv_smart labels:VPP-336
--comment: initial changeset for alerts_product_channel_level

CREATE TABLE  if not EXISTS inventory_smart.alerts_product_channel_level (
	article varchar NOT NULL,
	channel varchar NOT NULL,
    l0_name varchar NULL,
    l1_name varchar NULL,
	l2_name varchar NULL,
	l3_name varchar NULL,
    style_name varchar NULL,
	oh_dc float4 NULL,
    total_inv int4 NULL,
    actual_promo_percentage float4 NULL,
    planned_promo_percentage float4 NULL,
    past_4_weeks_actual float4 NULL,
    past_4_weeks_forecast float4 NULL,
    next_4_weeks_forecast float4 NULL,
    recent_deviation float4 NULL,
    recent_deviation_flag float4 NULL,
    carry_over_exp_flag float4 NULL,
    core_exp_flag float4 NULL,
    rd_is_resolved int4 DEFAULT 0 NULL,
    co_is_resolved int4 DEFAULT 0 NULL,
    core_is_resolved int4 DEFAULT 0 NULL,
	CONSTRAINT alerts_product_channel_level_un UNIQUE (article, channel)
);



--changeset abhishek.sagar@impactanalytics.co:product_attributes_filter_add_col stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment:  addition of col changeset for alerts channel level
ALTER TABLE inventory_smart.alerts_product_channel_level
ADD COLUMN IF NOT EXISTS color_id varchar null,
ADD COLUMN IF NOT EXISTS replenish_status varchar null,
ADD COLUMN IF NOT EXISTS style_type varchar null,
ADD COLUMN IF NOT EXISTS f_style_fabric varchar null;