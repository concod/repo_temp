--liquibase formatted sql
--changeset paras.jain@impactanalytics.co:assort_smart.plan_master_line_review_mapper stripComments:false splitStatements:false context:MTP-75018 labels:create_table
--comment: Adding_If_exists

-- DROP TABLE assort_smart.plan_master_line_review_mapper;

CREATE TABLE  IF NOT EXISTS assort_smart.plan_master_line_review_mapper (
	id serial4 NOT NULL,
	plan_code int4 NOT NULL,
	line_review_plan_master_id int4 NOT NULL,
	CONSTRAINT plan_master_line_review_mapper_pkey PRIMARY KEY (id)
);