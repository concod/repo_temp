--liquibase formatted sql
--changeset nikhil.shet@impactanalytics.co:tb_integration_data_1 stripComments:false splitStatements:false context:Release_1_0 labels:promotion
--comment: Create table for storing promotion integration data (price file data) with partitioning on integration_id
--rollback: DROP TABLE IF EXISTS price_promo.tb_integration_data;

CREATE TABLE IF NOT EXISTS price_promo.tb_integration_data (
    integration_id INTEGER NOT NULL REFERENCES price_promo.tb_integration_logs(integration_id),
    promo_id INTEGER NOT NULL,
    event_id INTEGER,
    priority_number INTEGER NOT NULL,
    "action" TEXT NOT NULL CHECK (action IN ('execute', 'withdraw')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Promotion and product details
    event_name TEXT,
    offer_name TEXT NOT NULL,
    "price start date" DATE NOT NULL,
    "price end date" DATE NOT NULL,
    brand TEXT NOT NULL,
    productcode TEXT NOT NULL,
    brandsku TEXT NOT NULL,
    productprice NUMERIC NOT NULL,
    saleprice NUMERIC NOT NULL,
    currency TEXT NOT NULL,
    "user" TEXT NOT NULL,
    "user mail" TEXT NOT NULL,
    module TEXT NOT NULL DEFAULT 'Promo',
    offer_type TEXT NOT NULL,
    "offer value" TEXT NOT NULL,
    
    PRIMARY KEY (integration_id, promo_id, brandsku, currency)
) PARTITION BY LIST (integration_id);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_integration_data_promo_id ON price_promo.tb_integration_data USING BTREE(promo_id);
CREATE INDEX IF NOT EXISTS idx_integration_data_brand ON price_promo.tb_integration_data USING BTREE(brand);
