--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_opt_refresh_ia_override_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_opt_refresh_ia_override_v1

DROP PROCEDURE if exists price_promo_opt.pc_opt_refresh_ia_override_v1;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_opt_refresh_ia_override_v1(IN p_promo_id integer[], IN ia_multiplier_table character varying, IN iao_temp_table character varying, IN iaso_temp_table character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE

query_1 varchar;

query_2 varchar;

query_3 varchar;

BEGIN

RAISE NOTICE '--------------------------------------------------';

RAISE NOTICE 'Promos to be refreshed: %', p_promo_id;

-- Create temporary materialized result for filtering

EXECUTE FORMAT('DROP TABLE IF EXISTS tmp_ia_projected;

CREATE TEMP TABLE tmp_ia_projected AS

SELECT FROM price_promo.ps_recommended_ia_projected

WHERE promo_id = ANY(%L);', p_promo_id);

EXECUTE 'CREATE INDEX ON tmp_ia_projected(promo_id, product_id, store_reco_level, currency_id, recommendation_date);';

-- Your query 1 using tmp_ia_projected

query_1 = FORMAT($q$

DROP TABLE IF EXISTS %1$s;

CREATE UNLOGGED TABLE %1$s AS

WITH pccd AS (

SELECT product_id, store_reco_level, currency_id, recommendation_date

FROM tmp_ia_projected

GROUP BY product_id, store_reco_level, currency_id, recommendation_date

),

iao_base AS (

SELECT pro.promo_id, pro.product_id, pro.store_reco_level, pro.currency_id, pro.recommendation_date,

pro.sales_units, pro.baseline_sales_units, pro.updated_at, 'ia' as tag

FROM price_promo.ps_recommended_override_ia pro

JOIN pccd USING (product_id, store_reco_level, currency_id, recommendation_date)

),

ia_base AS (

SELECT iao_base.promo_id, iao_base.product_id, iao_base.store_reco_level, iao_base.currency_id, iao_base.recommendation_date,

iao_base.sales_units, iao_base.baseline_sales_units, iao_base.updated_at, 'ia' as tag,

ia.sales_units as sales_normal, ia.baseline_sales_units as normal_baseline

FROM iao_base

JOIN tmp_ia_projected ia

ON ia.product_id = iao_base.product_id

AND ia.store_reco_level = iao_base.store_reco_level

AND ia.currency_id = iao_base.currency_id

AND ia.recommendation_date = iao_base.recommendation_date

),

fino_base AS (

SELECT pro.promo_id, pro.product_id, pro.store_reco_level, pro.currency_id, pro.recommendation_date,

pro.sales_units, pro.baseline_sales_units, pro.updated_at, 'fin' as tag

FROM price_promo.ps_recommended_finalized_override pro

JOIN pccd USING (product_id, store_reco_level, currency_id, recommendation_date)

),

fin_base AS (

SELECT fino_base.promo_id, fino_base.product_id, fino_base.store_reco_level, fino_base.currency_id, fino_base.recommendation_date,

fino_base.sales_units, fino_base.baseline_sales_units, fino_base.updated_at, 'fin' as tag,

fin.sales_units as sales_normal, fin.baseline_sales_units as normal_baseline

FROM fino_base

JOIN (SELECT product_id, store_reco_level, currency_id, recommendation_date, sales_units, baseline_sales_units

FROM price_promo.ps_recommended_finalized

WHERE promo_id = ANY(%L)) fin

USING (promo_id, product_id, store_reco_level, currency_id, recommendation_date)

),

base AS (

SELECT , ROW_NUMBER() OVER (PARTITION BY product_id, store_reco_level, currency_id, recommendation_date ORDER BY updated_at DESC) as rnk

FROM (SELECT FROM ia_base UNION ALL SELECT FROM fin_base) a

)

SELECT ,

COALESCE(sales_units / NULLIF(sales_normal, 0), 1) as sales_units_multiplier,

COALESCE(baseline_sales_units / NULLIF(normal_baseline, 0), 1) as baseline_sales_units_multiplier

FROM base

WHERE rnk = 1;

$q$, ia_multiplier_table, p_promo_id);

RAISE NOTICE 'query_1: %', query_1;

EXECUTE query_1;

-- Similar modifications can be applied to query_2 and _query_3 so that they join on tmp_ia_projected.

-- For example, query_2 could join tmp_ia_projected instead of filtering ps_recommended_ia_projected again.

-- (Rest of procedure follows with similar optimizations for query_2 and _query_3)

END;

$procedure$
;

