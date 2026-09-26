--liquibase formatted sql
--changeset abhimanyu.j@impactanalytics.co:create_item_schema1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_initial_commit
--comment: Rebuilds item_smart.new_skus and normalizes all column types (IDs->integer, amounts->numeric, strings->varchar incl. sku_status)
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS item_smart.create_new_sku_per();

CREATE OR REPLACE PROCEDURE item_smart.create_new_sku_per()
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
BEGIN
  ----------------------------------------------------------------------
  -- 1) Rebuild table from sources (keeps your SELECT * approach)
  ----------------------------------------------------------------------
  DROP TABLE IF EXISTS item_smart.new_skus CASCADE;

  CREATE TABLE item_smart.new_skus AS
  SELECT
      phf.*,
      nsr.is_cadence_generated,
      nsr.is_mapped,
      nsr.mapped_product_code,
      nsr.mapped_product_code_description,
      -- Materialize sku_status; normalize to varchar in the post-ALTER step too
      CASE
        WHEN nsr.is_cadence_generated = true  AND nsr.is_mapped = true THEN 'Copied to WP'
        WHEN (nsr.is_cadence_generated = false OR nsr.is_cadence_generated IS NULL)
             AND (nsr.is_mapped = false OR nsr.is_mapped IS NULL) THEN 'Unmapped'
        WHEN (nsr.is_cadence_generated = false OR nsr.is_cadence_generated IS NULL)
             AND nsr.is_mapped = true THEN 'Mapped'
      END AS sku_status
  FROM public.new_skus_refresh nsr
  LEFT JOIN item_smart.mv_product_hierarchies_filter phf
    ON nsr.hierarchy_code = phf.hierarchy_code;

  ----------------------------------------------------------------------
  -- 2) Normalize ALL target columns in ONE ALTER TABLE (older format)
  --    IDs -> integer, numeric amounts -> numeric, string tails -> varchar
  ----------------------------------------------------------------------
  DO $$
  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'item_smart' AND table_name = 'new_skus'
    ) THEN
      EXECUTE $sql$
        ALTER TABLE item_smart.new_skus
        ------------------------------------------------------------------
        -- Integer ID columns (function expects integer)
        ------------------------------------------------------------------
        ALTER COLUMN l0_id TYPE integer USING l0_id::integer,
        ALTER COLUMN l1_id TYPE integer USING l1_id::integer,
        ALTER COLUMN l2_id TYPE integer USING l2_id::integer,
        ALTER COLUMN l3_id TYPE integer USING l3_id::integer,
        ALTER COLUMN l4_id TYPE integer USING l4_id::integer,
        ALTER COLUMN l5_id TYPE integer USING l5_id::integer,

        ------------------------------------------------------------------
        -- Numeric amounts (function expects numeric; avoid float8)
        ------------------------------------------------------------------
        ALTER COLUMN price TYPE numeric USING price::numeric,
        ALTER COLUMN cost TYPE numeric USING cost::numeric,
        ALTER COLUMN original_price TYPE numeric USING original_price::numeric,
        ALTER COLUMN cost_first_product_value TYPE numeric USING cost_first_product_value::numeric,
        ALTER COLUMN cost_fully_loaded_ship_value TYPE numeric USING cost_fully_loaded_ship_value::numeric,
        ALTER COLUMN std_ship_cost_value TYPE numeric USING std_ship_cost_value::numeric,

        ------------------------------------------------------------------
        -- Units & mapping as VARCHAR (fix text vs varchar mismatches)
        ------------------------------------------------------------------
        ALTER COLUMN cost_first_product_unit TYPE varchar USING cost_first_product_unit::varchar,
        ALTER COLUMN cost_fully_loaded_ship_unit TYPE varchar USING cost_fully_loaded_ship_unit::varchar,
        ALTER COLUMN std_ship_cost_unit TYPE varchar USING std_ship_cost_unit::varchar,
        ALTER COLUMN mapped_product_code TYPE varchar USING mapped_product_code::varchar,
        ALTER COLUMN mapped_product_code_description TYPE varchar USING mapped_product_code_description::varchar,

        ALTER COLUMN size_set_pack TYPE varchar USING size_set_pack::varchar,
        ALTER COLUMN print_catalog TYPE varchar USING print_catalog::varchar,
        ALTER COLUMN drop_ship TYPE varchar USING drop_ship::varchar,
        ALTER COLUMN vendor TYPE varchar USING vendor::varchar,
        ALTER COLUMN vendor_label TYPE varchar USING vendor_label::varchar,
        ALTER COLUMN country_of_origin TYPE varchar USING country_of_origin::varchar,

        ------------------------------------------------------------------
        -- Ensure sku_status is varchar (not text)
        ------------------------------------------------------------------
        ALTER COLUMN sku_status TYPE varchar USING sku_status::varchar
        ;
      $sql$;
    END IF;
  END $$;

  ----------------------------------------------------------------------
  -- 3) Done
  ----------------------------------------------------------------------
  RAISE NOTICE 'item_smart.new_skus rebuilt; datatypes normalized (IDs=integer, amounts=numeric, strings=varchar incl. sku_status).';
END;
$procedure$;
