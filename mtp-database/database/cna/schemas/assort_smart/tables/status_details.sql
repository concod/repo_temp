
--liquibase formatted sql
--changeset pulimallika.teja@impactanalytics.co :assort_smart.status_details stripComments:false splitStatements:false context:MTP-51802 labels:add_missing_cols
--comment: initial changeset for status_details


CREATE TABLE IF not exists assort_smart.status_details (
	id int4 NOT NULL,
	attribute_name varchar NOT NULL,
	display_name varchar NOT NULL,
	steps_id int4 NOT NULL
);