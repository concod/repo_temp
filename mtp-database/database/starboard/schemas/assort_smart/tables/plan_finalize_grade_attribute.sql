
--liquibase formatted sql
--changeset pulimallika.teja@impactanalytics.co :assort_smart.plan_finalize_grade_attribute stripComments:false splitStatements:false context:MTP-70241 labels:create_table
--comment: initial changeset for plan_finalize_grade_attribute

CREATE TABLE IF not exists assort_smart.plan_finalize_grade_attribute (
	plan_finalize_grade_id int4 NULL,
	attribute_name varchar NOT NULL,
	attribute_value jsonb NOT NULL
);