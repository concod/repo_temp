--liquibase formatted sql
--changeset narendren.saravanan@impactanalytics.co:create_tb_residential_sub_customer_type_config stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: Create table for residential sub customer types

CREATE TABLE IF NOT EXISTS price_promo.tb_residential_sub_customer_type_config (
    id SERIAL4 NOT NULL,
    residential_sub_customer_type VARCHAR(100) NOT NULL,
    is_active INT2 DEFAULT 1 NULL,
    CONSTRAINT tb_residential_sub_customer_type_config_pkey PRIMARY KEY (id),
    CONSTRAINT tb_residential_sub_customer_type_config_unique UNIQUE (residential_sub_customer_type)
);
