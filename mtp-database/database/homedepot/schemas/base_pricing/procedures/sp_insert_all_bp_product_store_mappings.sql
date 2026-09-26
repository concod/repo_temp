--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:sp_insert_all_bp_product_store_mappings_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: sp_insert_all_bp_product_store_mappings_v1

DROP PROCEDURE IF EXISTS base_pricing.sp_insert_all_bp_product_store_mappings();

CREATE OR REPLACE PROCEDURE base_pricing.sp_insert_all_bp_product_store_mappings()
 LANGUAGE plpgsql
AS $procedure$
DECLARE
  tbl text;
  query text;
  p_k text;
  tn text;
BEGIN
  FOR tbl IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'base_pricing'
      AND tablename LIKE 'bp_product_store_mapping_%'
      AND tablename NOT IN ('bp_product_store_mapping') 
  LOOP
    RAISE NOTICE 'Processing table: %', tbl;

SELECT
    tc.constraint_name, concat(tc.table_schema,'.', tc.table_name) as tn
into p_k,tn
FROM
    information_schema.table_constraints tc
WHERE
    tc.constraint_type = 'PRIMARY KEY'
    AND tc.table_name = tbl
    AND tc.table_schema = 'base_pricing';

    query := format($fmt$
      INSERT INTO base_pricing.bp_product_store_mapping (
        product_id,
        store_id,
        segment_id,
        channel_id,
        base_cost,
        additional_cost,
        total_cost,
        price,
        price_lock,
        status,
        eligibility,
		is_kvi
      )
      WITH joined_data AS (
        SELECT
          s.product_id,
          s.store_id,
          s.segment_id,
          sm.s0_cid AS channel_id,
          COALESCE(attr.base_cost, 0) AS base_cost,
          COALESCE(attr.rebate, 0) AS rebate,
          COALESCE(attr.marketplace_fee, 0) AS marketplace_fee,
          COALESCE(attr.shipping_cost, 0) AS shipping_cost,
          s.price,
          s.price_lock,
          pm.active AS product_active,
          sm.active AS store_active,
		  s.is_kvi,
		  s.eligibility,
          CASE 
            WHEN sm.s0_cid IN (1, 2) THEN COALESCE(attr.base_cost, 0) - COALESCE(attr.rebate, 0)
            WHEN sm.s0_cid = 3 THEN COALESCE(attr.base_cost, 0) - COALESCE(attr.rebate, 0) + COALESCE(attr.marketplace_fee, 0)
            WHEN sm.s0_cid IN (4, 5) THEN COALESCE(attr.base_cost, 0) - COALESCE(attr.rebate, 0) + COALESCE(attr.shipping_cost, 0)
            ELSE 0
          END AS additional_cost
        FROM  (select * from base_pricing.%I  {where})s
        
        INNER JOIN base_pricing.bp_product_master pm ON s.product_id = pm.product_id AND pm.active = true
        INNER JOIN base_pricing.bp_store_master sm ON s.store_id = sm.store_id AND sm.active = true
        INNER JOIN base_pricing.bp_product_attributes attr ON s.product_id = attr.product_id
      )
	  SELECT
        product_id,
        store_id,
        segment_id,
        channel_id,
        base_cost,
        additional_cost,
        base_cost + additional_cost AS total_cost,
        price,
        price_lock,
        true AS status,
        eligibility,
		is_kvi
      FROM joined_data	
    $fmt$, tbl);

   PERFORM public.parellel_insert ('WITH rows AS (
            ' || query || '
            RETURNING 1
        ) 
        SELECT 
          count(1) as cnt 
        FROM 
          rows;',50,tn,'product_id',p_k,500);
  END LOOP;
END;
$procedure$
;
