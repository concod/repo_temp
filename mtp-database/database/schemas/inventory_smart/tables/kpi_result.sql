--liquibase formatted sql
--changeset liquibase:kpi_result stripComments:false splitStatements:false context:MTP-108633 labels:MTP-108633
--comment: MTP-108633:initial changeset for kpi_result
CREATE TABLE IF NOT EXISTS inventory_smart.kpi_result (
    result_id BIGSERIAL PRIMARY KEY,
    kpi_id INT NOT NULL REFERENCES inventory_smart.kpi_config(kpi_id),
    article VARCHAR(128),
    store_code VARCHAR(128),
    dc_code VARCHAR(100),
    result_date DATE,
    kpi_values JSONB,
    time_window_start DATE,
    time_window_end DATE,
    updated_at TIMESTAMP DEFAULT now(),
    UNIQUE(kpi_id, article, store_code, dc_code, result_date)
);
CREATE INDEX IF NOT EXISTS idx_kpi_result_kpi_id_result_date ON inventory_smart.kpi_result (kpi_id, result_date DESC);
CREATE INDEX IF NOT EXISTS idx_kpi_result_article_store_date ON inventory_smart.kpi_result (article, store_code, result_date DESC);

--changeset liquibase:kpi_result_v2_drop stripComments:false splitStatements:false context:MTP-108633 labels:MTP-108633
--comment: MTP-108633:drop existing kpi_result table and dependent views for schema update
DROP TABLE IF EXISTS inventory_smart.kpi_result CASCADE;
CREATE TABLE inventory_smart.kpi_result (
    result_id bigserial NOT NULL,
    granularity varchar(20) NOT NULL,
    store_code varchar(50) NULL,
    product_code varchar(50) NULL,
    calculation_date date NOT NULL,
    kpi_values jsonb NOT NULL,
    batch_id varchar(50) NOT NULL,
    calculated_at timestamp NOT NULL,
    synced_at timestamp DEFAULT now() NULL,
    CONSTRAINT kpi_result_pkey PRIMARY KEY (result_id),
    CONSTRAINT uk_kpi_result UNIQUE (granularity, store_code, product_code, calculation_date)
);
CREATE INDEX idx_kpi_result_batch ON inventory_smart.kpi_result USING btree (batch_id);
CREATE INDEX idx_kpi_result_date ON inventory_smart.kpi_result USING btree (calculation_date DESC);
CREATE INDEX idx_kpi_result_granularity_date ON inventory_smart.kpi_result USING btree (granularity, calculation_date DESC);
CREATE INDEX idx_kpi_result_product ON inventory_smart.kpi_result USING btree (product_code, calculation_date) WHERE ((granularity)::text = 'product'::text);
CREATE INDEX idx_kpi_result_product_store ON inventory_smart.kpi_result USING btree (product_code, store_code, calculation_date) WHERE ((granularity)::text = 'product_store'::text);
CREATE INDEX idx_kpi_result_store ON inventory_smart.kpi_result USING btree (store_code, calculation_date) WHERE ((granularity)::text = 'store'::text);

--changeset liquibase:kpi_result_v3_flexible_schema stripComments:false splitStatements:false context:MTP-108633 labels:MTP-108633
--comment: MTP-120981:add article and store_type columns for flexible granularity support (Product-Store or Article-Store)

-- Add new columns
ALTER TABLE inventory_smart.kpi_result ADD COLUMN IF NOT EXISTS article VARCHAR(128);
ALTER TABLE inventory_smart.kpi_result ADD COLUMN IF NOT EXISTS store_type VARCHAR(50);

-- Drop redundant indexes
DROP INDEX IF EXISTS inventory_smart.idx_kpi_result_date;
DROP INDEX IF EXISTS inventory_smart.idx_kpi_result_product;
DROP INDEX IF EXISTS inventory_smart.idx_kpi_result_store;

-- Index for article_store granularity joins
CREATE INDEX IF NOT EXISTS idx_kpi_result_article_store ON inventory_smart.kpi_result USING btree (article, store_code, calculation_date) WHERE ((granularity)::text = 'article_store'::text);

--changeset adesh:kpi_result_drop_batch_id_v5 stripComments:false splitStatements:false context:MTP-122243 labels:MTP-122243
--comment: MTP-122243: Drop batch_id column and its index from kpi_result
DROP INDEX IF EXISTS inventory_smart.idx_kpi_result_batch;
ALTER TABLE inventory_smart.kpi_result DROP COLUMN IF EXISTS batch_id;
