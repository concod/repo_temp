
--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_strategy_forecast_details_v2 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_strategy_forecast_details_v2

CREATE TABLE base_pricing.bp_strategy_forecast_details (
	opt_level_bins varchar NOT NULL,
	"size" float8 NULL,
	price_point float8 NOT NULL,
	price_per_unit float8 NULL,
	"cost" float8 NULL,
	current_price float8 NULL,
	predicted float8 NULL,
	elasticity float8 NULL,
	baseline_predicted float8 NULL,
	pricechange_percent float8 NULL,
	pricechange_amount float8 NULL,
	CONSTRAINT pk_strategy_forecast_details PRIMARY KEY (opt_level_bins, price_point)
);
CREATE INDEX idx_bp_strategy_forecast_details_opt_level_bins ON base_pricing.bp_strategy_forecast_details USING btree (opt_level_bins);
CREATE INDEX idx_strategy_forecast_opt_level ON base_pricing.bp_strategy_forecast_details USING btree (opt_level_bins, price_point);