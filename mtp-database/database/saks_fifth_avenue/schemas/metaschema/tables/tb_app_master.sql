--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:tb_app_master_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_app_master

CREATE TABLE "metaschema"."tb_app_master" (
    id serial4 NOT NULL,
    name varchar(100) NOT NULL,
    sequence int4 NOT NULL DEFAULT 0,
    remarks varchar(200) NOT NULL,
    CONSTRAINT tb_app_master_pkey PRIMARY KEY (name),
    CONSTRAINT tb_app_master_id_key UNIQUE (id)
)
;