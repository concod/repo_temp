--liquibase formatted sql
--changeset liquibase:forecast_alerts_demand_zero stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for forecast_alerts_demand_zero

CREATE TABLE IF NOT EXISTS inventory_smart.forecast_alerts_demand_zero (
	product_code varchar NULL,
	store_code varchar NULL,
	past_4_week_actuals int8 NULL,
	next_4_week_forecast int8 NULL,
	ly_past_4_week_actuals int8 NULL,
	ly_next_4_week_actuals int8 NULL,
	oh int8 NULL,
	oo int8 NULL,
	it int8 NULL,
	launch_date date NULL,
	l2_name varchar NULL,
	l3_name varchar NULL,
	l4_name varchar NULL,
	l5_name varchar NULL,
	primary_trait_desc varchar NULL,
	product_type varchar NULL,
	item_status varchar NULL,
	store_name varchar NULL,
	channel varchar NULL,
	region int8 NULL,
	state varchar NULL,
	district int8 NULL,
	store_attribute_1 int8 NULL,
	zerodemand_is_resolved int4 DEFAULT 0 NULL,
	CONSTRAINT forecast_alerts_demand_zero_unique UNIQUE (product_code, store_code)
);