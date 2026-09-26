
--liquibase formatted sql
--changeset pulimallika.teja@impactanalytics.co :assort_smart.assort_wedge_request_constraints stripComments:false splitStatements:false context:MTP-51802 labels:add_missing_cols
--comment: initial changeset for assort_wedge_request_constraints



CREATE TABLE IF not exists assort_smart.assort_wedge_request_constraints (
	request_id text NULL,
	attribute_value jsonb NULL
);