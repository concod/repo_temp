--liquibase formatted sql
--changeset abhishek.sagar@impactanalytics.co:new_store_attributes_figs stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for new_store_attributes


CREATE TABLE IF NOT EXISTS "global".new_store_attributes (
    store_code varchar NULL,
    opening_date date NULL,
    sister_store_mapping_date date NULL,
    store_group_mapping_date date NULL,
    store_groups _varchar NULL DEFAULT ARRAY[]::character varying[],
    reservation_start_date date NULL,
    effective_date date NULL,
    temp_store_code varchar NULL,
    temp_opening_date date NULL,
    temp_legacy_store_mapping_date date NULL,
    temp_closing_date date NULL,
    temp_effective_date date NULL,
    legacy_store_code varchar NULL,
    legacy_closing_date date NULL,
    remodel_flag bool NULL,
    is_deleted bool DEFAULT false,
    status int4 NULL,
    CONSTRAINT pk PRIMARY KEY (store_code)
);
CREATE INDEX if not exists new_store_attributes_indx1 ON global.new_store_attributes USING btree (store_code);
