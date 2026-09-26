--liquibase formatted sql
--changeset hemanth.cs@impactanalytics.co:assort_smart.plan_master_line_review_mapper stripComments:false splitStatements:false context:MTP-75018 labels:create_table
--comment: initial changeset for plan_master_line_review_mapper

-- DROP TABLE assort_smart.plan_master_line_review_mapper;

CREATE TABLE assort_smart.plan_master_line_review_mapper (
	id serial4 NOT NULL,
	plan_code int4 NOT NULL,
	line_review_plan_master_id int4 NOT NULL,
	CONSTRAINT plan_master_line_review_mapper_pkey PRIMARY KEY (id)
);