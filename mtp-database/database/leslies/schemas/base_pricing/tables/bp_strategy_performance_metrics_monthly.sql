--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_strategy_performance_metrics_monthly_10 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_strategy_performance_metrics_monthly_10

CREATE TABLE base_pricing.bp_strategy_performance_metrics_monthly (
	strategy_id int4 NOT NULL,
	product_id int4 NOT NULL,
	store_id int4 NOT NULL,
	"month" varchar(2) NOT NULL,
	"source" varchar(50) NOT NULL,
	segment_id int4 NOT NULL,
	sales_units float8 NULL,
	base_price float8 NULL,
	revenue float8 NULL,
	gross_margin_dollar float8 NULL,
	gross_margin_percentage float8 NULL,
	average_selling_price float8 NULL,
	average_unit_margin float8 NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	time_period date NULL,
	"year" int4 NULL,
	CONSTRAINT bp_strategy_performance_metrics_monthly_pkey PRIMARY KEY (strategy_id, product_id, store_id, month, source, segment_id),
	CONSTRAINT fk_product_monthly FOREIGN KEY (product_id) REFERENCES base_pricing.bp_product_master(product_id) ON DELETE CASCADE
)
PARTITION BY LIST (strategy_id);
CREATE INDEX idx_bp_perf_metrics_monthly_prod_store ON  base_pricing.bp_strategy_performance_metrics_monthly USING btree (product_id, store_id);
CREATE INDEX idx_bp_perf_metrics_monthly_product ON  base_pricing.bp_strategy_performance_metrics_monthly USING btree (product_id);
CREATE INDEX idx_bp_perf_metrics_monthly_segment ON  base_pricing.bp_strategy_performance_metrics_monthly USING btree (segment_id);
CREATE INDEX idx_bp_perf_metrics_monthly_source ON  base_pricing.bp_strategy_performance_metrics_monthly USING btree (source);
CREATE INDEX idx_bp_perf_metrics_monthly_store ON  base_pricing.bp_strategy_performance_metrics_monthly USING btree (store_id);
CREATE INDEX idx_bp_perf_metrics_monthly_strat_prod_store ON  base_pricing.bp_strategy_performance_metrics_monthly USING btree (strategy_id, product_id, store_id);
CREATE INDEX idx_bp_perf_metrics_monthly_strat_segment ON  base_pricing.bp_strategy_performance_metrics_monthly USING btree (strategy_id, segment_id);
CREATE INDEX idx_bp_perf_metrics_monthly_strategy ON  base_pricing.bp_strategy_performance_metrics_monthly USING btree (strategy_id);
CREATE INDEX idx_bp_perf_metrics_monthly_time ON  base_pricing.bp_strategy_performance_metrics_monthly USING btree (month);


--changeset abhishek.singh@impactanalytics.co:bp_strategy_performance_metrics_monthly_1 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: adding baseline_sales_units, baseline_revenue, baseline_gross_margin_dollar, baseline_gross_margin_percentage, baseline_average_selling_price, baseline_average_unit_margin columns to base_pricing.bp_strategy_performance_metrics_monthly

ALTER TABLE base_pricing.bp_strategy_performance_metrics_monthly 
ADD COLUMN baseline_sales_units int8 NULL,
ADD COLUMN baseline_revenue float8 NULL,
ADD COLUMN baseline_gross_margin_dollar float8 NULL,
ADD COLUMN baseline_gross_margin_percentage float8 NULL,
ADD COLUMN baseline_average_selling_price float8 NULL,
ADD COLUMN baseline_average_unit_margin float8 NULL;


--changeset abhishek.singh@impactanalytics.co:bp_strategy_performance_metrics_monthly_2 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changing store_id column from int4 to text in base_pricing.bp_strategy_performance_metrics_monthly_baseline

ALTER TABLE base_pricing.bp_strategy_performance_metrics_monthly 
DROP COLUMN store_id;

ALTER TABLE base_pricing.bp_strategy_performance_metrics_monthly 
ADD COLUMN store_id text NULL;