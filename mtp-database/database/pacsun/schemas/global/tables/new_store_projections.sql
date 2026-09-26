--liquibase formatted sql
--changeset sreevathsa.sp@impactanalytics.co:new_store_data stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for new_store_projections

CREATE TABLE IF NOT EXISTS "global".new_store_projections(
    id serial4 NOT NULL,
    store_code text NOT NULL,
    sister_store_code text NOT NULL,
    l0_name text NULL,
    l1_name text NULL,
    l2_name text NULL,
    l3_id_name text NULL,
    l4_name text NULL,
    l5_name text NULL,
    l6_name text NULL,
    l7_name text NULL,
    projected_units int4 NULL,
    projected_value numeric NULL,
    extra_attributes jsonb DEFAULT '{}'::jsonb NULL,
    created_at timestamp DEFAULT now() NULL,
    updated_at timestamp DEFAULT now() NULL,
    CONSTRAINT new_store_projections_pkey PRIMARY KEY (id),
    CONSTRAINT fk_new_store_projections_store_code FOREIGN KEY (store_code) REFERENCES "global".new_store_data(store_code) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_new_store_projections_store_code ON global.new_store_projections USING btree (store_code);

--changeset abijithsarath.menon@impactanalytics.co:new_store_data stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: store code ddl change
ALTER TABLE global.new_store_projections 
DROP CONSTRAINT fk_new_store_projections_store_code;

-- Recreate with CASCADE options
ALTER TABLE global.new_store_projections 
ADD CONSTRAINT fk_new_store_projections_store_code 
FOREIGN KEY (store_code) 
REFERENCES global.new_store_data(store_code) 
ON DELETE CASCADE 
ON UPDATE CASCADE;

--changeset sreevathsa.sp@impactanalytics.co:add_new_store_projection_columns stripComments:false splitStatements:false context:Release_1_1 labels:add_new_store_projection_columns
--comment: Add additional columns to new_store_projections table
ALTER TABLE global.new_store_projections 
ADD COLUMN IF NOT EXISTS l4_id text NULL,
ADD COLUMN IF NOT EXISTS ladder text NULL,
ADD COLUMN IF NOT EXISTS markdown_ind text NULL,
ADD COLUMN IF NOT EXISTS fit text NULL,
ADD COLUMN IF NOT EXISTS launch_date date NULL,
ADD COLUMN IF NOT EXISTS brand text NULL,
ADD COLUMN IF NOT EXISTS store_code_name text NULL,
ADD COLUMN IF NOT EXISTS style_color_description text NULL,
ADD COLUMN IF NOT EXISTS store_name text NULL,
ADD COLUMN IF NOT EXISTS article text NULL,
ADD COLUMN IF NOT EXISTS s0_name text NULL,
ADD COLUMN IF NOT EXISTS channel text NULL,
ADD COLUMN IF NOT EXISTS channel_name text NULL,
ADD COLUMN IF NOT EXISTS multiplier numeric NULL,
ADD COLUMN IF NOT EXISTS wos numeric NULL;


--changeset sreevathsa.sp@impactanalytics.co:drop_new_store_projection_columns stripComments:false splitStatements:false context:Release_1_1 labels:pacsun_drop_new_store_projection_columns
--comment: drop few columns in new_store_projections table
ALTER TABLE global.new_store_projections 
DROP COLUMN IF EXISTS l4_id,
DROP COLUMN IF EXISTS l4_name,
DROP COLUMN IF EXISTS ladder,
DROP COLUMN IF EXISTS markdown_ind,
DROP COLUMN IF EXISTS fit,
DROP COLUMN IF EXISTS article;

--changeset parmanand.mishra@impactanalytics.co:new_store_data stripComments:false splitStatements:false context:Release_1_2 labels:liquibase_project_start
--comment: store code ddl change
ALTER TABLE global.new_store_projections 
DROP CONSTRAINT fk_new_store_projections_store_code;