--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:tb_app_sub_master_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_app_sub_master
CREATE TABLE metaschema.tb_app_sub_master (
	id serial4 NOT NULL,
	master_id int4 NOT NULL,
	"name" varchar(100) NOT NULL,
	"sequence" int4 DEFAULT 0 NOT NULL,
	remarks varchar(200) NOT NULL,
	sub_parent int8 DEFAULT 0 NOT NULL,
	is_default int2 DEFAULT 0 NULL,
	display_name varchar(100) NULL,
	is_active int2 DEFAULT 1 NULL,
	CONSTRAINT tb_app_sub_master_pkey PRIMARY KEY (master_id, name, sub_parent),
	CONSTRAINT master_fk FOREIGN KEY (master_id) REFERENCES metaschema.tb_app_master(id) ON DELETE CASCADE
);