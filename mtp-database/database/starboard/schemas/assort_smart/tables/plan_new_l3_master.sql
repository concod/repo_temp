
--liquibase formatted sql
--changeset pulimallika.teja@impactanalytics.co :assort_smart.plan_new_l3_master stripComments:false splitStatements:false context:MTP-70241 labels:create_table
--comment: initial changeset for plan_new_l3_master

CREATE TABLE IF not exists assort_smart.plan_new_l3_master (
	plan_code int4 NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NULL,
	levels jsonb NULL,
	"attributes" jsonb NULL,
	style_code _varchar NULL
);