

--liquibase formatted sql
--changeset pulimallika.teja@impactanalytics.co :assort_smart.plan_finalize_grade_master stripComments:false splitStatements:false context:MTP-70241 labels:create_table
--comment: initial changeset for plan_finalize_grade_master

CREATE TABLE IF not exists assort_smart.plan_finalize_grade_master (
	plan_finalize_grade_id serial4 NOT NULL,
	plan_code int4 NOT NULL,
	levels jsonb NOT NULL,
	CONSTRAINT plan_finalize_grade_master_pkey PRIMARY KEY (plan_finalize_grade_id)
);