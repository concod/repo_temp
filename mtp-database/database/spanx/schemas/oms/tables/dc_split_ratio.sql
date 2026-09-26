--liquibase formatted sql
--changeset liquibase:dc_split_ratio stripComments:false splitStatements:false context:initial_release labels:liquibase_project_start
--comment: initial changeset for dc_split_ratio 

CREATE TABLE IF NOT EXISTS inventory_smart.dc_split_ratio (
	article varchar NULL,
	product_code varchar NULL,
	"size" varchar NULL,
	loc_code varchar NULL,
	channel text NULL,
	penetration float8 NULL,
	fiscal_year_week int4 NULL,
	CONSTRAINT pk_dc_split_ratio UNIQUE (product_code, loc_code, fiscal_year_week)
);