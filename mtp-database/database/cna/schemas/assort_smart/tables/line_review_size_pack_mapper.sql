--liquibase formatted sql
--changeset rishabh.kumar@impactanalytics.co :assort_smart.line_review_size_pack_mapper stripComments:false splitStatements:false context:line_review_size_pack_mapper labels:add_missing_cols
--comment: initial changeset for line_review_size_pack_mapper

CREATE TABLE IF NOT EXISTS assort_smart.line_review_size_pack_mapper (
	id serial4 NOT NULL,
	line_review_plan_master_id int4 NULL,
	size_pack_plan_master_id int4 NULL,
	CONSTRAINT line_review_size_pack_mapper_pkey PRIMARY KEY (id)
);