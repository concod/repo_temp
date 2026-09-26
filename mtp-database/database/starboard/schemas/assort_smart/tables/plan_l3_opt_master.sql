
--liquibase formatted sql
--changeset pulimallika.teja@impactanalytics.co :assort_smart.plan_l3_opt_master_1 stripComments:false splitStatements:false context:MTP-70241 labels:create_table
--comment: initial changeset for plan_l3_opt_master

CREATE TABLE IF not exists assort_smart.plan_l3_opt_master (
	plan_bud_opt_id serial4 NOT NULL,
	plan_code int4 NOT NULL,
	levels jsonb NOT NULL,
	is_active varchar DEFAULT 'YES'::character varying NULL,
	attribute_value jsonb NULL,
	CONSTRAINT plan_l4_opt_master_master_pkey PRIMARY KEY (plan_bud_opt_id)
);
CREATE INDEX If Not Exists plan_l3_opt_master_plan_code_idx ON assort_smart.plan_l3_opt_master USING btree (plan_code);