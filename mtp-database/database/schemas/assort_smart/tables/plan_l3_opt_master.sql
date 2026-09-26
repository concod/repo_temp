--liquibase formatted sql
--changeset liquibase:plan_l3_opt_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_l3_opt_master
CREATE TABLE assort_smart.plan_l3_opt_master (
	plan_bud_opt_id serial4 NOT NULL,
	plan_code int4 NOT NULL,
	levels jsonb NOT NULL,
	is_active varchar NULL DEFAULT 'YES'::character varying,
	attribute_value jsonb NULL,
	CONSTRAINT plan_l4_opt_master_master_pkey PRIMARY KEY (plan_bud_opt_id)
);
--changeset hemant.kumar@impactanalytics.co:assort_smart.plan_l3_opt_master liquibase:plan_l3_opt_master stripComments:false splitStatements:false context:plan_code_add_in_index labels:liquibase_project_start
--comment: initial changeset for plan_l3_opt_master
CREATE INDEX plan_l3_opt_master_plan_code_idx ON assort_smart.plan_l3_opt_master (plan_code);
