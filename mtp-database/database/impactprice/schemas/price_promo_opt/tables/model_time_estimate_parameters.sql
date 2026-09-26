--liquibase formatted sql
    --changeset vaibhav:model_time_estimate_parameters stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
    --comment: initial changeset for model_time_estimate_parameters



CREATE TABLE price_promo_opt.model_time_estimate_parameters (
	model_name text NULL,
	coeff_promo_duration float8 NULL,
	coeff_products_count float8 NULL,
	coeff_stores_count float8 NULL,
	coeff_discount_points int8 NULL,
	intercept float8 NULL,
	accuracy float8 NULL,
	last_updated_at text NULL
);