--liquibase formatted sql
--changeset pranshu.pandey@impactanalytics.co:tb_form_sections stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initital changeset for tb_form_sections

CREATE TABLE pricesmart.tb_form_sections (
    section_id SERIAL PRIMARY KEY,
    form_id INT REFERENCES pricesmart.tb_forms(form_id) ON DELETE CASCADE,
    section_name VARCHAR(50) NOT NULL,
    section_order INT NOT NULL,
    is_active BOOLEAN DEFAULT true
);