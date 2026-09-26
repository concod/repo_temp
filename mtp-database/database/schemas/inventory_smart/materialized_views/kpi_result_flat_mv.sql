--liquibase formatted sql
--changeset liquibase:kpi_result_flat_mv runOnChange:true stripComments:false splitStatements:false context:MTP-122243 labels:MTP-122243
--comment: MTP-122243:materialized view that expands kpi_values JSONB into individual rows per KPI
--rollback: DROP MATERIALIZED VIEW IF EXISTS inventory_smart.kpi_result_flat_mv;

DROP MATERIALIZED VIEW IF EXISTS inventory_smart.kpi_result_flat_mv;

CREATE MATERIALIZED VIEW inventory_smart.kpi_result_flat_mv AS
SELECT 
    kr.result_id,
    kr.granularity,
    kr.product_code,
    kr.article,
    kr.store_code,
    kr.store_type,
    kr.calculation_date,
    kr.calculated_at,
    kr.synced_at,
    kpi.key AS kpi_name,
    kpi.value::NUMERIC AS kpi_value
FROM inventory_smart.kpi_result kr
CROSS JOIN LATERAL jsonb_each_text(kr.kpi_values) AS kpi(key, value)
WITH DATA;

-- Unique index required for REFRESH MATERIALIZED VIEW CONCURRENTLY
CREATE UNIQUE INDEX idx_kpi_flat_mv_unique ON inventory_smart.kpi_result_flat_mv (result_id, kpi_name);

-- Indexes for common query patterns
CREATE INDEX idx_kpi_flat_mv_kpi_name ON inventory_smart.kpi_result_flat_mv (kpi_name, calculation_date DESC);
CREATE INDEX idx_kpi_flat_mv_product_store ON inventory_smart.kpi_result_flat_mv (product_code, store_code, calculation_date);
CREATE INDEX idx_kpi_flat_mv_article_store ON inventory_smart.kpi_result_flat_mv (article, store_code, calculation_date);
CREATE INDEX idx_kpi_flat_mv_granularity ON inventory_smart.kpi_result_flat_mv (granularity, calculation_date DESC);

