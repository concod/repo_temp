--liquibase formatted sql
--changeset nischay.p@impactanalytics.co:rcl_priority_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts
--comment: initial changeset for rcl_priority_mapping

CREATE TABLE if not exists "global".rcl_priority_mapping (
	"level" _varchar DEFAULT ARRAY[]::character varying[] NOT NULL,
	rcl_priority int4 NOT NULL,
	module_code int4 NULL,
	CONSTRAINT rcl_level_check CHECK ((cardinality(level) > 0)),
	CONSTRAINT rcl_priority_module_uk UNIQUE (rcl_priority, module_code),
	CONSTRAINT rcl_priority_mapping_module_code_fkey FOREIGN KEY (module_code) REFERENCES "global".module_master(module_code)
);
CREATE UNIQUE INDEX rcl_priority_level_uk ON global.rcl_priority_mapping USING btree (global.form_array(level), module_code);

--changeset nischay.p@impactanalytics.co:rcl_priority_mapping_add_rcl_column stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts_1
--comment: alter table changeset for rcl_priority_mapping_add_column

alter table "global".rcl_priority_mapping add column rcl_code int4 ;
ALTER TABLE "global".rcl_priority_mapping
ADD CONSTRAINT rcl_priority_mapping_pkey PRIMARY KEY (rcl_code);
