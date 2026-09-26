--liquibase formatted sql
--changeset pranshu.pandey@impactanalytics.co:tb_forms stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initital changeset for tb_forms

CREATE TABLE pricesmart.tb_forms (
    form_id SERIAL PRIMARY KEY,
    form_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    CONSTRAINT uniq_form_name UNIQUE (form_name)
);