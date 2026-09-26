--liquibase formatted sql
--changeset liquibase:plan_omni_wedge_opt_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_omni_wedge_opt_master
CREATE TABLE assort.plan_omni_wedge_opt_master (
	source_plan_code int4 NOT NULL,
	source_choice_id varchar NOT NULL,
	attribute_value jsonb NOT NULL,
	destination_plan_code int4 NOT NULL,
	destination_choice_id varchar NOT NULL,
	destination_attribute_value jsonb NULL,
	source_levels jsonb NULL,
	CONSTRAINT plan_omni_wedge_opt_master_un UNIQUE (source_plan_code, source_choice_id, destination_plan_code, destination_choice_id)
);
CREATE INDEX plan_omni_wedge_opt_master_plan_code_idx ON assort.plan_omni_wedge_opt_master USING btree (source_plan_code);