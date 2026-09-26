--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_baseline_metrics stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_baseline_metrics


CREATE TABLE base_pricing_restaurant.bp_baseline_metrics (
	strategy_id int4 NOT NULL,
	baseline_sales numeric(15, 2) NOT NULL,
	baseline_revenue numeric(15, 2) NOT NULL,
	baseline_gross_margin_dollar numeric(15, 2) NOT NULL,
	baseline_gross_margin_percentage numeric(8, 4) NOT NULL,
	baseline_average_selling_price numeric(10, 2) NOT NULL,
	baseline_average_unit_margin numeric(10, 2) NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT bp_baseline_metrics_pkey PRIMARY KEY (strategy_id),
	CONSTRAINT fk_bp_baseline_metrics_strategy_id FOREIGN KEY (strategy_id) REFERENCES base_pricing_restaurant.bp_strategy_master(strategy_id)
);


--changeset abhishek.singh@impactanalytics.co:bp_baseline_metrics_1 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_baseline_metrics_1

ALTER TABLE base_pricing_restaurant.bp_baseline_metrics 
    ALTER COLUMN baseline_sales TYPE numeric(30, 2),
    ALTER COLUMN baseline_revenue TYPE numeric(30, 2),
    ALTER COLUMN baseline_gross_margin_dollar TYPE numeric(30, 2),
    ALTER COLUMN baseline_gross_margin_percentage TYPE numeric(30, 4),
    ALTER COLUMN baseline_average_selling_price TYPE numeric(30, 2),
    ALTER COLUMN baseline_average_unit_margin TYPE numeric(30, 2);