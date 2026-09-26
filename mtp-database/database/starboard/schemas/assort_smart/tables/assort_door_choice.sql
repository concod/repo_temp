


--liquibase formatted sql
--changeset pulimallika.teja@impactanalytics.co :assort_smart.all_door_choice stripComments:false splitStatements:false context:MTP-51802 labels:add_missing_cols
--comment: initial changeset for all_door_choice




CREATE TABLE IF not exists assort_smart.all_door_choice (
	core_choice_id serial4 NOT NULL,
	levels json NULL,
	"year" varchar NOT NULL,
	quarter varchar NULL,
	all_door_cc int8 NOT NULL,
	season_id varchar NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	CONSTRAINT core_choice_table_pk PRIMARY KEY (core_choice_id)
);