--liquibase formatted sql
--changeset adil.nawaz@impactanalytics.co:store_groups_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start

CREATE TABLE IF NOT EXISTS "demand_smart".store_groups_mapping (
    sg_code int4 NOT NULL,
    store_code varchar NOT NULL,
    CONSTRAINT store_groups_mapping_pk PRIMARY KEY (sg_code, store_code),
    CONSTRAINT store_groups_mapping_fk FOREIGN KEY (sg_code) REFERENCES "demand_smart".store_groups(sg_code) ON DELETE CASCADE,
    CONSTRAINT store_groups_mapping_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
);