--liquibase formatted sql
--changeset rajesh.kumar@impactanalytics.co:new_store_projections stripComments:false splitStatements:false context:RELEASE_1_0_0 labels:87585 
--comment Creating new table
CREATE TABLE IF NOT EXISTS global.new_store_projections (
    store_code TEXT NOT NULL,
    l0_name TEXT,
    l1_name TEXT,
    l2_name TEXT,
    l3_name TEXT,
    l4_name TEXT,
    l5_name TEXT,
    l6_name TEXT,
    l7_name TEXT,
    projected_units INTEGER,
    projected_value NUMERIC,
    extra_attributes JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_new_store_projections_store_code
        FOREIGN KEY (store_code)
        REFERENCES global.new_store_data(store_code)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_new_store_projections_store_code
    ON global.new_store_projections (store_code);

--changeset rajesh.kumar@impactanalytics.co:id_column stripComments:false splitStatements:false context:Release_1 labels:new_column_added
--comment: create new column in new_store_projections table
ALTER TABLE global.new_store_projections
ADD COLUMN IF NOT EXISTS id SERIAL PRIMARY KEY;

--changeset rajesh.kumar@impactanalytics.co:sister_store_code_column stripComments:false splitStatements:false context:Release_1 labels:new_column_added
--comment: create new column in new_store_projections table
ALTER TABLE global.new_store_projections
ADD COLUMN IF NOT EXISTS sister_store_code TEXT NOT NULL;

--changeset himansh.bhardwaj@impactanalytics.co:range_name_column stripComments:false splitStatements:false context:Release_1 labels:new_column_added
--comment: range_name_column
ALTER TABLE global.new_store_projections
ADD COLUMN IF NOT EXISTS range_name TEXT NULL;

--changeset himansh.bhardwaj@impactanalytics.co:dropping_foreign_constraint stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: dropping_foreign_constraint
ALTER TABLE global.new_store_projections 
DROP CONSTRAINT IF EXISTS fk_new_store_projections_store_code;