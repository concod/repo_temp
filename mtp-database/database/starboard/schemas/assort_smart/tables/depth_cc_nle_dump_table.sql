
--liquibase formatted sql
--changeset pulimallika.teja@impactanalytics.co :assort_smart.depth_cc_nle_dump_table stripComments:false splitStatements:false context:MTP-51802 labels:add_missing_cols
--comment: initial changeset for depth_cc_nle_dump_table


CREATE TABLE IF not exists assort_smart.depth_cc_nle_dump_table (
	plan_cls_depth_id int4 NULL,
	plan_code int4 NULL,
	levels jsonb NULL,
	attribute_value jsonb NULL
);