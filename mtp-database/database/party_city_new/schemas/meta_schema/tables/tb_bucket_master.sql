--liquibase formatted sql
--changeset arshad.k@impactanalytics.co:tb_bucket_master stripComments:false splitStatements:false context:Release_1_0 labels:MTP-49552
--comment: initial changeset for tb_bucket_master

CREATE TABLE meta_schema.tb_bucket_master (
	id serial4 NOT NULL,
	"name" varchar(30) NOT NULL,
	display_name varchar(30) NOT NULL,
	remark varchar(300) NULL,
	CONSTRAINT tb_bucket_master_id_key UNIQUE (id),
	CONSTRAINT tb_bucket_master_pkey PRIMARY KEY (name)
);

--changeset partha.samanta@impactanalytics.co:tb_bucket_master_alter_1 stripComments:false splitStatements:false context:Release_1_1 labels:MTP-49531
--comment: added a new column extra
ALTER TABLE meta_schema.tb_bucket_master ADD extra jsonb DEFAULT '{}' NOT NULL;
