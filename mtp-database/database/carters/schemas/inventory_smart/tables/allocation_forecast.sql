-- liquibase formatted sql
-- changeset shameel.zeshan@impactanalytics.co:allocation_forecast stripComments:false splitStatements:false context: db_sync labels:allocation_forecast
-- comment: initial changeset for allocation_forecast

CREATE TABLE inventory_smart.allocation_forecast (
	l0_name varchar NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	l3_name varchar NULL,
	l4_name varchar NULL,
	l5_name varchar NULL,
	article varchar NULL,
	"style" varchar NULL,
	product_code varchar NULL
);