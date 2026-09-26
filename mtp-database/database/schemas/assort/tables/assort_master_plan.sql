--liquibase formatted sql
--changeset liquibase:assort_master_plan stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for assort_master_plan
CREATE TABLE assort.assort_master_plan (
	plan_master_id serial4 NOT NULL,
	levels jsonb NOT NULL,
	attribute_value jsonb NOT NULL,
	l0_name varchar NULL,
	l1_name varchar NULL,
	channel varchar NULL,
	start_date date NULL
)
PARTITION BY LIST (l0_name);