--liquibase formatted sql
--changeset liquibase:plan_budget_master_drop stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_budget_master_drop
CREATE TABLE assort_smart.plan_budget_master_drop (
	plan_budget_drop_id serial4 NOT NULL,
	plan_code int4 NOT NULL,
	levels jsonb NOT NULL,
	attribute_value jsonb NOT NULL,
	CONSTRAINT plan_budget_master_drop_pkey PRIMARY KEY (plan_budget_drop_id)
);