--liquibase formatted sql
--changeset pradeep.kumar@impactanalytics.co:dc_split_ratio_update2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start_update2
--comment: included if not exists in create statement update2

CREATE TABLE IF NOT EXISTS inventory_smart.dc_split_ratio (
	id serial4 NOT NULL,
	article varchar(50) NULL,
	product_code varchar(50) NOT NULL,
	"size" varchar(50) NULL,
	loc_code varchar(50) NOT NULL,
	channel varchar(50) NOT NULL,
	fiscal_year_week int4 NOT NULL,
	penetration float8 NULL,
	CONSTRAINT pk_dc_split_ratio PRIMARY KEY (product_code, loc_code, channel, fiscal_year_week)
);

