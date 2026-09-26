--liquibase formatted sql
--changeset liquibase:tags_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tags_master
CREATE TABLE global.tags_master (
    tag_code serial4 NOT NULL,
    tag_datatype character varying,
    tag_key character varying,
    tag_value character varying
);
ALTER TABLE global.tags_master ADD CONSTRAINT tags_master_pk PRIMARY KEY (tag_code);
