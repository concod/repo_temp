
--liquibase formatted sql
--changeset pulimallika.teja@impactanalytics.co :assort_smart.assort_core_size stripComments:false splitStatements:false context:MTP-51802 labels:add_missing_cols
--comment: initial changeset for assort_core_size

CREATE TABLE IF not exists assort_smart.assort_core_size (
	l0_name varchar NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	l3_name varchar NULL,
	"size" varchar NULL,
	core bool NULL,
	store_type varchar NULL
);