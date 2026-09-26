--liquibase formatted sql
--changeset aniruddh:eligible_article_store_pack runOnChange:true stripComments:false splitStatements:false context:version 1.1c labels:version 1.1c
--comment: version 1.1c replace '-' with ' ' in l0_name
--rollback: SELECT  1

-- inventory_smart.eligible_article_store_pack
-- Returns eligible (article, store_code, eligible_packs) combining:
--   1) All 'eaches' pack_type_ids from input (article, pack_type_id) pairs for all provided stores
--      filtered by l0_name if provided (via global.product_attributes_filter)
--   2) All 'packs' eligibilities from inventory_smart.prepack_eligibility for provided articles and stores,
--      filtered by l0_name if provided. Packs are prefixed as 'packs_'.
--
-- Parameters:
--   p_table1_name            text  : name of an unlogged staging table with columns (article, store_code, size)
--   p_table2_name            text  : name of an unlogged staging table with columns (article, pack_type_id, size)
--   p_l0_name                text  : optional; if NULL, do not filter by l0_name. If provided, filter by exact match
--
-- Notes:
-- - stores are derived as DISTINCT store_code from p_table1_name
-- - pairs are derived as DISTINCT (article, pack_type_id) from p_table2_name
-- - articles are derived as DISTINCT article from p_table1_name
-- - After returning results, the function DROPs both input tables with CASCADE

DROP FUNCTION IF EXISTS inventory_smart.eligible_article_store_pack(text, text, text);

CREATE OR REPLACE FUNCTION inventory_smart.eligible_article_store_pack(
    p_table1_name  text,
    p_table2_name  text,
    p_l0_name      text DEFAULT NULL
)
RETURNS TABLE (
    article        text,
    store     text,
    pack_type text
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_t1 regclass;
  v_t2 regclass;
  v_sql text;
BEGIN
  -- Resolve provided table names to regclass (supports schema-qualified names safely)
  v_t1 := to_regclass(p_table1_name);
  v_t2 := to_regclass(p_table2_name);

  IF v_t1 IS NULL THEN
    RAISE EXCEPTION 'Table not found: %', p_table1_name;
  END IF;
  IF v_t2 IS NULL THEN
    RAISE EXCEPTION 'Table not found: %', p_table2_name;
  END IF;

  -- Build dynamic SQL using resolved identifiers
  v_sql := format($f$
    WITH
    stores AS (
      SELECT DISTINCT store::text AS store FROM %s
    ),
    pairs AS (
      SELECT DISTINCT article::text AS article, 
             CASE WHEN pack_type_id::text LIKE 'packs_%%' THEN substring(pack_type_id::text FROM 7) ELSE pack_type_id::text END AS pack_type_id 
             FROM %s
    ),
    articles AS (
      SELECT DISTINCT article::text AS article FROM %s
    ),
    sku_filtered AS (
      SELECT s.article, s.pack_type_id, s.pack_type
      FROM inventory_smart.sku_dc_available_units s
      JOIN pairs p ON p.article = s.article AND p.pack_type_id = s.pack_type_id
      UNION
      SELECT s.article, s.pack_type_id, s.pack_type
      FROM inventory_smart.sku_po_available_units s
      JOIN pairs p ON p.article = s.article AND p.pack_type_id = s.pack_type_id
    ),
    eligible_eaches AS (
      SELECT DISTINCT
        sf.article,
        st.store,
        'packs_' || sf.pack_type_id AS pack_type
      FROM sku_filtered sf
      CROSS JOIN stores st
      WHERE sf.pack_type = 'eaches'
    ),
    eligible_packs AS (
      SELECT
        pe.article,
        pe.store_code store,
        'packs_' || pe.eligible_packs::text AS pack_type
      FROM inventory_smart.prepack_eligibility pe
      JOIN articles a USING (article)
      JOIN stores st ON st.store = pe.store_code
      WHERE pe.eligible_packs IS NOT NULL
        AND (pe.l0_name = $1)
    )
    SELECT DISTINCT article::text, store::text, pack_type::text
    FROM (
      SELECT article::text, store::text, pack_type::text
      FROM eligible_eaches
      UNION ALL
      SELECT article::text, store::text, pack_type::text
      FROM eligible_packs
    ) AS u
  $f$, v_t1, v_t2, v_t1);

  RAISE NOTICE 'Dynamic Metrics Query --> %', v_sql; 
  -- Return the result
  RETURN QUERY EXECUTE v_sql USING replace(p_l0_name, '-', ' ');
END;
$$;