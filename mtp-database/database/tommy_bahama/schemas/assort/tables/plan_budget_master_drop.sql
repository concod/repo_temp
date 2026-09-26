--liquibase formatted sql
--changeset liquibase:plan_budget_master_drop_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_budget_master_drop
CREATE TABLE if not exists assort.plan_budget_master_drop (
	plan_budget_drop_id serial4 NOT NULL,
	plan_code int4 NOT NULL,
	levels jsonb NOT NULL,
	attribute_value jsonb NOT NULL,
	CONSTRAINT plan_budget_master_drop_pkey PRIMARY KEY (plan_budget_drop_id) ,
	CONSTRAINT plan_budget_master_drop_fk FOREIGN KEY (plan_code) REFERENCES assort.plan_master(plan_code) ON DELETE CASCADE
);

