--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_strategy_channel_metrics_summary stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_strategy_channel_metrics_summary


CREATE TABLE base_pricing_restaurant.bp_strategy_channel_metrics_summary (
	strategy_id int4 NOT NULL,
	channel_id int4 NOT NULL,
	channel_name varchar(50) NOT NULL,
	product_count int2 DEFAULT 0 NOT NULL,
	store_count int2 DEFAULT 0 NOT NULL,
	segment_count int2 DEFAULT 0 NOT NULL,
	rules_count int2 DEFAULT 0 NOT NULL,
	rules_exception_count int8 DEFAULT 0 NOT NULL,
	price_changes int8 DEFAULT 0 NULL,
	price_increased int8 DEFAULT 0 NULL,
	price_decreased int8 DEFAULT 0 NULL,
	finalized_sales_units int8 NULL,
	ia_rec_sales_units int8 NULL,
	sales_units_target int4 NULL,
	sales_units_priority int4 NULL,
	finalized_revenue int8 NULL,
	ia_rec_revenue int8 NULL,
	revenue_target int4 NULL,
	revenue_priority int4 NULL,
	finalized_gm_dollar int8 NULL,
	ia_rec_gm_dollar int8 NULL,
	gm_dollar_target int4 NULL,
	gm_dollar_priority int4 NULL,
	finalized_gm_percent int4 NULL,
	ia_rec_gm_percent int4 NULL,
	gm_percent_target int4 NULL,
	gm_percent_priority int4 NULL,
	finalized_asp int8 NULL,
	ia_rec_asp int8 NULL,
	asp_target int4 NULL,
	asp_priority int4 NULL,
	finalized_aum int8 NULL,
	ia_rec_aum int8 NULL,
	aum_target int4 NULL,
	aum_priority int4 NULL,
	total_price_points int4 NULL,
	modified_by int4 NOT NULL,
	modified_on timestamp NOT NULL,
	approved_by int4 NULL,
	approved_on timestamp NULL,
	CONSTRAINT bp_strategy_channel_metrics_summary_pkey PRIMARY KEY (strategy_id, channel_id),
	CONSTRAINT fk_strategy_id FOREIGN KEY (strategy_id) REFERENCES base_pricing_restaurant.bp_strategy_master(strategy_id) ON DELETE CASCADE
)
PARTITION BY LIST (strategy_id);


--changeset yashraj.jha@impactanalytics.co:bp_strategy_channel_metrics_summary_2 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_strategy_channel_metrics_summary_2
ALTER TABLE base_pricing_restaurant.bp_strategy_channel_metrics_summary
ADD COLUMN actuals_sales_units FLOAT8 NULL,
ADD COLUMN actuals_revenue FLOAT8 NULL,
ADD COLUMN actuals_gm_dollar FLOAT8 NULL,
ADD COLUMN acutals_gm_percent FLOAT8 NULL,
ADD COLUMN actuals_asp FLOAT8 NULL,
ADD COLUMN actuals_aum FLOAT8 NULL;


--changeset yashraj.jha@impactanalytics.co:bp_strategy_channel_metrics_summary_3 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_strategy_channel_metrics_summary_3
ALTER TABLE base_pricing_restaurant.bp_strategy_channel_metrics_summary
RENAME COLUMN acutals_gm_percent TO actuals_gm_percent;

