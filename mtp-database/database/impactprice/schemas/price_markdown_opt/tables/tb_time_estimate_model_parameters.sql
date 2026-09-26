--liquibase formatted sql
--changeset surya.avinash@impactanalytics:tb_time_estimate_model_parameters stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_time_estimate_model_parameters

CREATE TABLE price_markdown_opt.tb_time_estimate_model_parameters (
	model_name text NULL,
	coeff_product_recommendation_level_minus_200 float8 NULL,
	coeff_product_recommendation_level_minus_100 float8 NULL,
	coeff_product_recommendation_level_1 float8 NULL,
	coeff_product_recommendation_level_2 float8 NULL,
	coeff_product_recommendation_level_3 float8 NULL,
	coeff_product_recommendation_level_4 float8 NULL,
	coeff_product_recommendation_level_5 float8 NULL,
	coeff_product_recommendation_level_6 float8 NULL,
	coeff_store_recommendation_level_minus_200 float8 NULL,
	coeff_store_recommendation_level_minus_100 float8 NULL,
	coeff_store_recommendation_level_1 float8 NULL,
	coeff_store_recommendation_level_2 float8 NULL,
	coeff_store_recommendation_level_3 float8 NULL,
	coeff_store_recommendation_level_4 float8 NULL,
	coeff_store_recommendation_level_5 float8 NULL,
	coeff_store_recommendation_level_6 float8 NULL,
	coeff_log_sku_count float8 NULL,
	coeff_log_store_count float8 NULL,
	coeff_log_pcd_count float8 NULL,
	coeff_log_discount_count float8 NULL,
	intercept float8 NULL,
	r2_score float8 NULL,
	load_date timestamp NULL
);