--liquibase formatted sql
--changeset syed.faizan@impactanalytics.co:tb_role_application_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_role_application_mapping

CREATE TABLE "pricesmart".tb_role_application_mapping (
    role_code INT NOT NULL,
    application_code INT NOT NULL,
    CONSTRAINT tb_role_application_mapping_pk 
        PRIMARY KEY (role_code, application_code)
);