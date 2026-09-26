--liquibase formatted sql
--changeset suryasai.gopal@impactanalytics.co:productseason_master  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for invsa_generic_schema_mapping
-- "global".productseason_master definition

-- Drop table

-- DROP TABLE "global".productseason_master;

CREATE TABLE "global".productseason_master (
	product_code varchar NOT NULL,
	season varchar NOT NULL,
	merchant_pyramid_colorway varchar NULL,
	merchant_pyramid varchar NULL,
	retailer_markup float8 NULL,
	direct_imu_target float8 NULL,
	indirect_imu_target float8 NULL,
	sku varchar NOT NULL,
	selling_collection varchar NULL,
	company_code varchar NOT NULL,
	channel varchar NULL,
	new_carryover_sku varchar NULL,
	new_carryover_style varchar NULL,
	dropship_flag bool NULL,
	season_l3_name varchar NOT NULL,
	product_cost float8 NULL,
	wholesale_price float8 NULL,
	original_price float8 NULL,
	product_price float8 NULL,
	imputed_flag varchar NULL,
	sku_season_launch_date varchar NULL,
	style_season_launch_date varchar NULL,
	sku_dropped_date varchar NULL,
	style_dropped_date varchar NULL,
	season_start_date date NULL,
	season_end_date date NULL,
	CONSTRAINT productseason_master_pk PRIMARY KEY (product_code, season, company_code)
);
