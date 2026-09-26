--liquibase formatted sql
--changeset liquibase:product_mapping_product_store_validated_table stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_mapping_product_store_validated_table

-- DROP TABLE IF EXISTS global.product_mapping_product_store_validated_table;
CREATE TABLE global.product_mapping_product_store_validated_table (
	l0_name varchar NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	l3_name varchar NULL,
	l4_name varchar NULL,
	l5_name varchar NULL,
	l6_name varchar NULL,
	l7_code varchar NULL,
	article varchar NULL,
	"size" varchar NULL,
	product_code varchar NOT NULL,
	display_article varchar NULL,
	display_product_code varchar NULL,
	store_code varchar NOT NULL,
	on_floor_date date NULL,
	end_forecast_date date NULL,
	start_eligibility_date date NULL,
	end_eligibility_date date NULL,
	CONSTRAINT product_mapping_product_store_validated_pk PRIMARY KEY (product_code, store_code)
);