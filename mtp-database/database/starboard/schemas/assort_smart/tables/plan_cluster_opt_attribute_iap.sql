--liquibase formatted sql
--changeset mayank.bhardwaj@impactanalytics.co :assort_smart.plan_cluster_opt_attribute_iap stripComments:false splitStatements:false context:MTP-70241 labels:create_table
--comment: initial changeset for plan_cluster_opt_attribute_iap

CREATE TABLE IF not exists assort_smart.plan_cluster_opt_attribute_iap (
	plan_clu_opt_attr_id serial4 NOT NULL,
	attribute_name varchar NOT NULL,
	sub_attribute_name varchar NOT NULL,
	sell_through float8 DEFAULT 0.0 NULL,
	penetration_ly float8 DEFAULT 0.0 NULL,
	penetration_ty float8 DEFAULT 0.0 NULL,
	total_quantity float8 DEFAULT 0.0 NULL,
	margin_percentage float8 DEFAULT 0.0 NULL,
	plan_clu_opt_id int8 NOT NULL,
	CONSTRAINT plan_cluster_opt_attribute_iap_pkey PRIMARY KEY (plan_clu_opt_attr_id),
	CONSTRAINT fk_plan_cluster_opt_master_iap FOREIGN KEY (plan_clu_opt_id) REFERENCES assort_smart.plan_cluster_opt_master_iap(plan_clu_opt_id)
);

--changeset ezhil.kannan@impactanalytics.co:add_composite_idx_plan_cluster_opt_attr_iap_starboard stripComments:false splitStatements:false context:perf_optimization labels:alter_table
--comment: Add composite index on (plan_clu_opt_id, sub_attribute_name) for update-strategy-plan-compare-type performance
CREATE INDEX IF NOT EXISTS idx_plan_cluster_opt_attr_iap_composite
ON assort_smart.plan_cluster_opt_attribute_iap (plan_clu_opt_id, sub_attribute_name);