--liquibase formatted sql
--changeset mohammed.ayaz@impactanalytics.co:plan_cluster_opt_attribute_wp,column updates stripComments:false splitStatements:false context:MTP-40659 labels: initial_verison
--comment: initial changeset for plan_cluster_opt_attribute_wp
CREATE TABLE if not exists assort_smart.plan_cluster_opt_attribute_wp (
	plan_clu_opt_id serial4 NOT NULL,
	attribute_mapping_id int4 NOT NULL,
	sell_through float8 NULL DEFAULT 0.0,
	penetration_ly float8 NULL DEFAULT 0.0,
	penetration_ty float8 NULL DEFAULT 0.0,
	total_quantity float8 NULL DEFAULT 0.0,
	margin_percentage float8 NULL DEFAULT 0.0,
	CONSTRAINT plan_cluster_opt_attribute_wp_pkey PRIMARY KEY (plan_clu_opt_id)
);

--changeset mohammed.ayaz@impactanalytics.co:plan_cluster_opt_attribute_wp stripComments:false splitStatements:false context:MTP-47793 labels:liquibase_project_start
--comment: rename cols
ALTER TABLE assort_smart.plan_cluster_opt_attribute_wp
ADD COLUMN IF NOT exists attribute_name varchar NOT null,
ADD COLUMN if not exists sub_attribute_name varchar NOT null,
DROP column if exists attribute_mapping_id;

--changeset mayank.bhardwaj@impactanalytics.co:plan_cluster_opt_attribute_wp stripComments:false splitStatements:false context:MTP-60085 labels:liquibase_project_start
--comment: add and drop cols and constraints
ALTER TABLE assort_smart.plan_cluster_opt_attribute_wp
ADD COLUMN IF NOT EXISTS plan_clu_opt_attr_id SERIAL NOT NULL;

ALTER TABLE assort_smart.plan_cluster_opt_attribute_wp
DROP CONSTRAINT plan_cluster_opt_attribute_wp_pkey;
ALTER TABLE assort_smart.plan_cluster_opt_attribute_wp
ADD CONSTRAINT plan_cluster_opt_attribute_wp_pkey PRIMARY KEY (plan_clu_opt_attr_id);

ALTER TABLE assort_smart.plan_cluster_opt_attribute_wp
ADD CONSTRAINT fk_plan_cluster_opt_master_wp FOREIGN KEY (plan_clu_opt_id) REFERENCES assort_smart.plan_cluster_opt_master_wp(plan_clu_opt_id);