--liquibase formatted sql
--changeset mohan.krishna@impactanalytics.co:product_channel_discount_guardrails_v3 runAlways:true stripComments:false splitStatements:false context:product_channel_discount_guardrails labels:product_channel_discount_guardrails
--comment: adding channel column to product_channel_discount_guardrails
--rollback: SELECT 1

-- block_start1
DROP VIEW IF EXISTS price_promo_opt.product_channel_discount_guardrails;
-- block_end

CREATE OR REPLACE VIEW price_promo_opt.product_channel_discount_guardrails
AS SELECT product_id,
    channel,
    s0_id,
    s1_id,
    suggested_min_discount,
    suggested_max_discount,
    effective_start_date,
    effective_end_date,
    effective_start_week,
    effective_end_week,
    l4w_sales,
    l4w_discount_pct,
    l4w_cost,
    l4w_baseline_margin,
    l4w_baseline_margin_pct,
    ly_effective_sales,
    ly_effective_discount_pct,
    ly_cost,
    ly_baseline_margin,
    ly_baseline_margin_pct,
    avg_elasticity,
    "Flag"
   FROM price_promo_opt.product_channel_discount_guardrails_version
  WHERE version_code = global.get_table_version('price_promo_opt.product_channel_discount_guardrails_version'::text);
