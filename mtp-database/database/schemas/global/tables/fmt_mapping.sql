--liquibase formatted sql
--changeset liquibase:fmt_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for fmt_mapping
CREATE TABLE "global".fmt_mapping (
	tag varchar NOT NULL,
	hierarchy_level int4 NOT NULL,
	unique_by varchar NOT NULL,
	active bool NOT NULL
);

--changeset kamalesh.k:fmt_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding primary key to fmt_mapping table

ALTER TABLE global.fmt_mapping
Add column fmt_mapping_code serial4,
ADD CONSTRAINT fmt_mapping_pkey PRIMARY KEY (fmt_mapping_code);
