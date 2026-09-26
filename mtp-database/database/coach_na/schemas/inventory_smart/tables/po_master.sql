-- liquibase formatted sql
-- changeset rajesh.draksharapu@impactanalytics.co:po_master_schema_migration_v2 stripComments:false splitStatements:false context: db_sync labels:po_master
-- comment: Schema migration for po_master table - drop and recreate with new schema

-- Step 2: Create new table with new schema
CREATE TABLE inventory_smart.po_master (
    product_code varchar NOT NULL,
    channel varchar NOT NULL,
    po_id varchar NOT NULL,
    vendor_id varchar NULL,
    target_quantity int4 NULL,
    item varchar NULL,
    document_date date NULL,
    validity_period_start date NULL,
    validity_period_end date NULL,
    quantity int4 NULL,
    vendor_name varchar NULL,
    allocation_code varchar NULL,
    inventory_date date NULL,
    purchase_group varchar NULL,
    company_code varchar NULL,
    status varchar DEFAULT 'Pending'::character varying NULL
);

-- Step 3: Create indexes
CREATE INDEX idx_po_master_channel ON inventory_smart.po_master USING btree (channel);
CREATE INDEX idx_po_master_po_id ON inventory_smart.po_master USING btree (po_id);
CREATE INDEX idx_po_master_product_code ON inventory_smart.po_master USING btree (product_code);
CREATE INDEX idx_po_master_vendor_id ON inventory_smart.po_master USING btree (vendor_id);



-- changeset rajesh.draksharapu@impactanalytics.co:po_master_rename_columns_v1 stripComments:false splitStatements:false context: db_sync labels:po_master
-- comment: Rename po_id to po_code and validity_period_start to requirement_date in po_master table

DROP INDEX IF EXISTS inventory_smart.idx_po_master_po_id;

ALTER TABLE inventory_smart.po_master 
    RENAME COLUMN po_id TO po_code;

ALTER TABLE inventory_smart.po_master 
    RENAME COLUMN validity_period_start TO requirement_date;

CREATE INDEX idx_po_master_po_code ON inventory_smart.po_master USING btree (po_code);


-- changeset rajesh.draksharapu@impactanalytics.co:po_master_rename_columns_v2 stripComments:false splitStatements:false context: db_sync labels:po_master
-- comment: Rename po_id to po_code and validity_period_end to validity_start_date in po_master table


ALTER TABLE inventory_smart.po_master 
    RENAME COLUMN requirement_date TO validity_period_start;

ALTER TABLE inventory_smart.po_master 
    RENAME COLUMN validity_period_end TO requirement_date;


-- changeset hemantkumar.bajaj@impactanalytics.co:po_master_columns_v3 stripComments:false splitStatements:false context: db_sync labels:po_master
-- comment: adding article and article_orig in po_master table

alter table inventory_smart.po_master 
add column article varchar,
add column article_orig varchar;

-- changeset hemantkumar.bajaj@impactanalytics.co:po_master_columns_v4 stripComments:false splitStatements:false context: db_sync labels:po_master
-- comment: adding article and article_orig in po_master table


ALTER TABLE inventory_smart.po_master
ADD COLUMN ecom_sales INT4,
ADD COLUMN lw_sales INT4;

-- changeset hemantkumar.bajaj@impactanalytics.co:po_master_columns_v5 stripComments:false splitStatements:false context: db_sync labels:po_master
-- comment: adding dc_code in po_master table


ALTER TABLE inventory_smart.po_master
ADD COLUMN dc_code INT4;

-- changeset hemantkumar.bajaj@impactanalytics.co:po_master_columns_v6 stripComments:false splitStatements:false context: db_sync labels:po_master
-- comment: adding column in po_master table

ALTER TABLE inventory_smart.po_master
ADD COLUMN pack_type_id  VARCHAR,
add column available_qty INT4,
add column allocated_qty INT4;