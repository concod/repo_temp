--liquibase formatted sql
--changeset pranshu.pandey@impactanalytics.co:tb_form_attributes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initital changeset for tb_form_attributes

CREATE TABLE pricesmart.tb_form_attributes (
    attribute_id SERIAL PRIMARY KEY,
    section_id INT NOT NULL REFERENCES pricesmart.tb_form_sections(section_id) ON DELETE CASCADE,
    attribute_name VARCHAR(50) NOT NULL,
    label VARCHAR(50),
    type VARCHAR(30),
    placeholder VARCHAR(50),
    display_order INT NOT NULL,
    width INT NOT NULL, 
    validation_rules JSONB,
    extra_config JSONB,
    required BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true
);