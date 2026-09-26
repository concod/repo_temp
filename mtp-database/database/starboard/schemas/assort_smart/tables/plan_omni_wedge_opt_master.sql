--liquibase formatted sql
--changeset pulimallika.teja@impactanalytics.co :assort_smart.plan_new_l3_master_1 stripComments:false splitStatements:false context:MTP-70241 labels:create_table
--comment: initial changeset for plan_new_l3_master



CREATE TABLE IF not exists assort_smart.plan_omni_wedge_opt_master (
	source_plan_code int4 NOT NULL,
	source_choice_id varchar NOT NULL,
	attribute_value jsonb NOT NULL,
	destination_plan_code int4 NOT NULL,
	destination_choice_id varchar NOT NULL,
	destination_attribute_value jsonb NULL,
	source_levels jsonb NULL,
	CONSTRAINT plan_omni_wedge_opt_master_un UNIQUE (source_plan_code, source_choice_id, destination_plan_code, destination_choice_id)
);
CREATE INDEX If Not Exists plan_omni_wedge_opt_master_plan_code_idx ON assort_smart.plan_omni_wedge_opt_master USING btree (source_plan_code);