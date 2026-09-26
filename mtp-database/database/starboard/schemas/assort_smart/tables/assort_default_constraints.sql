
--liquibase formatted sql
--changeset pulimallika.teja@impactanalytics.co :assort_smart.assort_default_constraints stripComments:false splitStatements:false context:MTP-51802 labels:add_missing_cols
--comment: initial changeset for assort_default_constraints

CREATE TABLE IF not exists assort_smart.assort_default_constraints (
	levels jsonb NULL,
	attribute_name varchar NULL,
	attribute_value jsonb NULL
);