--liquibase formatted sql
--changeset adil.nawaz@impactanalytics.co:new_store_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start

CREATE TABLE IF NOT EXISTS "demand_smart".new_store_mapping (
    mapping_id INT GENERATED ALWAYS AS IDENTITY,
    store_code varchar NOT NULL, 
    sister_store_code varchar NOT NULL, 
    hierarchies jsonb NOT NULL,
    multiplier float8 DEFAULT 1,

    CONSTRAINT new_store_mapping_pk 
        PRIMARY KEY (mapping_id),
    
    CONSTRAINT new_store_mapping_fk 
        FOREIGN KEY (store_code) 
        REFERENCES "demand_smart".new_stores(store_code) ON DELETE CASCADE,

    CONSTRAINT new_store_mapping_sister_fk 
        FOREIGN KEY (sister_store_code) 
        REFERENCES "global".store_master(store_code) ON DELETE CASCADE
);