
--liquibase formatted sql
--changeset akashkumar.rana@impactanalytics.co:tb_feature_flags stripComments:false splitStatements:false context:add_feature_flags_table    labels:add_feature_flags_table
--comment: Add feature flags table

CREATE TABLE size_smart.tb_feature_flags (
    id              BIGSERIAL PRIMARY KEY,
    feature_key     VARCHAR(100) NOT NULL UNIQUE,
    is_enabled      BOOLEAN NOT NULL DEFAULT false,
    is_visible      BOOLEAN NOT NULL DEFAULT false,
    description     TEXT NULL
);