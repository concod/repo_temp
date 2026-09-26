--liquibase formatted sql
--changeset liquibase:kpi_config stripComments:false splitStatements:false context:MTP-108633 labels:MTP-108633
--comment: MTP-108633:initial changeset for kpi_config
CREATE TABLE IF NOT EXISTS inventory_smart.kpi_config (
  kpi_id SERIAL PRIMARY KEY,
  kpi_name VARCHAR(255) NOT NULL,
  kpi_description TEXT,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  is_active BOOLEAN DEFAULT TRUE,
  default_data_source VARCHAR(50) DEFAULT 'transaction',
  default_level VARCHAR(50) DEFAULT 'article_store'
);

--changeset liquibase:kpi_config_v3 stripComments:false splitStatements:false context:MTP-108633 labels:MTP-108633
--comment: MTP-108633:add kpi_label, updated_by columns, drop default_data_source and default_level, add unique constraint on kpi_name, and index on is_active
ALTER TABLE inventory_smart.kpi_config ADD COLUMN IF NOT EXISTS kpi_label VARCHAR(255),
ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);
ALTER TABLE IF EXISTS inventory_smart.kpi_config DROP COLUMN IF EXISTS default_data_source;
ALTER TABLE IF EXISTS inventory_smart.kpi_config DROP COLUMN IF EXISTS default_level;
ALTER TABLE IF EXISTS inventory_smart.kpi_config
ADD CONSTRAINT uniq_kpi_name UNIQUE (kpi_name);
CREATE INDEX IF NOT EXISTS idx_kpi_config_is_active ON inventory_smart.kpi_config (is_active);

--changeset liquibase:kpi_config_v4 stripComments:false splitStatements:false context:MTP-108633 labels:MTP-108633
--comment: MTP-108633:add granularity column to kpi_config
ALTER TABLE inventory_smart.kpi_config 
ADD COLUMN IF NOT EXISTS granularity VARCHAR(20) NOT NULL DEFAULT 'product_store';

--changeset liquibase:kpi_config_v5 stripComments:false splitStatements:false context:MTP-122243 labels:MTP-122243
--comment: MTP-122243:add-format-and-display-options
ALTER TABLE inventory_smart.kpi_config
ADD COLUMN IF NOT EXISTS display_format VARCHAR(20) DEFAULT 'number',
ADD COLUMN IF NOT EXISTS display_precision INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS aggregate_function VARCHAR(20) DEFAULT 'SUM';
