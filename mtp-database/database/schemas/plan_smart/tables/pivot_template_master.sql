--liquibase formatted sql
--changeset liquibase:pivot_template_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for pivot_template_master
CREATE TABLE plan_smart.pivot_template_master (
	template_id int4 NOT NULL DEFAULT nextval('plan_smart.report_template_master_template_id_seq'::regclass),
	plan_code int4 NOT NULL,
	template_name varchar NOT NULL,
	template_type varchar NOT NULL,
	levels jsonb NOT NULL
);