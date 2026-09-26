--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:bp_strategy_performance_metrics_monthly_6 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_strategy_performance_metrics_monthly_6

DROP TABLE IF EXISTS base_pricing_restaurant.bp_strategy_performance_metrics_monthly;

CREATE TABLE base_pricing_restaurant.bp_strategy_performance_metrics_monthly (
	strategy_id int4 NOT NULL,
	"source" varchar(50) NOT NULL,
	opt_level_bins text NOT NULL,
	product_id int4 NOT NULL,
	store_id text NOT NULL,
	segment_id int4 NOT NULL,
	time_period date NOT NULL,
	"month" int4 NOT NULL,
	"year" int4 NULL,
	base_price float8 NULL,
	baseline_sales_units int8 NULL,
	baseline_revenue float8 NULL,
	baseline_gross_margin_dollar float8 NULL,
	baseline_gross_margin_percentage float8 NULL,
	baseline_average_selling_price float8 NULL,
	baseline_average_unit_margin float8 NULL,
	sales_units float8 NULL,
	revenue float8 NULL,
	gross_margin_dollar float8 NULL,
	gross_margin_percentage float8 NULL,
	average_selling_price float8 NULL,
	average_unit_margin float8 NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT bp_strategy_performance_metrics_monthly_pkey PRIMARY KEY (strategy_id, opt_level_bins, time_period, source)
)
PARTITION BY LIST (strategy_id);
CREATE INDEX idx_bp_strategy_performance_metrics_monthly_id1 ON ONLY base_pricing_restaurant.bp_strategy_performance_metrics_monthly USING btree (product_id, store_id, segment_id) INCLUDE (source);
CREATE INDEX idx_bp_strategy_performance_metrics_monthly_id2 ON ONLY base_pricing_restaurant.bp_strategy_performance_metrics_monthly USING btree (time_period);
CREATE INDEX idx_bp_strategy_performance_metrics_monthly_id3 ON ONLY base_pricing_restaurant.bp_strategy_performance_metrics_monthly USING btree (source);
CREATE INDEX idx_bp_strategy_performance_metrics_monthly_main ON ONLY base_pricing_restaurant.bp_strategy_performance_metrics_monthly USING btree (strategy_id, time_period, source) INCLUDE (product_id, store_id, segment_id);