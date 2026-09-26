--liquibase formatted sql
--changeset liquibase:screen_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for screen_master
CREATE TABLE "global".screen_master (
	screen_code serial4 NOT NULL,
	screen_name varchar NOT NULL,
	is_active bool NULL DEFAULT true,
	description varchar NULL,
	dimensions _varchar NULL,
	application _int4 NULL,
	CONSTRAINT screen_master_pk PRIMARY KEY (screen_code)
);
--changeset liquibase:add a new column stripComments:false splitStatements:false context:MTP-40823 labels:MTP-40823
--comment: MTP-40823 Add a new column
ALTER TABLE "global".screen_master ADD COLUMN label VARCHAR DEFAULT NULL;
