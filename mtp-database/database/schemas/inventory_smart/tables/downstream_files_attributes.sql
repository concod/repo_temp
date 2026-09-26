--liquibase formatted sql
--changeset aniruddh.singh@impactanalytics.co:downstream_files_attributes stripComments:false splitStatements:false context:Release_1_0 labels:sm_downstream_files_attributes
--comment: initial changeset for downstream_files_attributes

CREATE TABLE IF NOT EXISTS inventory_smart.downstream_files_attributes (
    allocation_code varchar NOT NULL,
    attribute_name varchar NULL,
    attribute_code varchar NOT NULL,
    "timestamp" timestamptz DEFAULT now() NULL,
    auto_finalized bool DEFAULT false NULL,
    auto_released bool DEFAULT false NULL,
    type varchar DEFAULT 'auto' NULL,
    CONSTRAINT downstream_files_attributes_pk PRIMARY KEY (allocation_code, attribute_code)
);