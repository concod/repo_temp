--liquibase formatted sql
--changeset liquibase:plansmart_logger_table stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plansmart_logger_table

CREATE TABLE plan_smart.plansmart_logger_table (
	client varchar(255) NULL,
	"module" varchar(255) NULL,
	channel varchar(255) NULL,
	min_week int4 NULL,
	max_week int4 NULL,
	revenue_per float4 NULL,
	margin_per float4 NULL,
	eop_per float4 NULL,
	plan_id int4 NULL,
	l0_name varchar(255) NULL,
	l1_name varchar(255) NULL,
	l2_name varchar(255) NULL,
	l3_name varchar(255) NULL
);
