--liquibase formatted sql
--changeset vishnu.vardhan@impactanalytics.co:sync_user_access_hierarchy_flat_01 stripComments:false splitStatements:false runOnChange:true context:Release_1_0 labels:uam_hierarchy_security
--comment: Two-step sync function for user access hierarchy flat table

DROP FUNCTION IF EXISTS base_pricing.sync_user_access_hierarchy_flat;

CREATE OR REPLACE FUNCTION base_pricing.sync_user_access_hierarchy_flat(
    p_user_code INT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_source_updated_at TIMESTAMP;
BEGIN
    /* -------------------------------------------------------------------
       1️⃣ PRE-CHECK: Run only if source is newer than flat
    ------------------------------------------------------------------- */
    SELECT uahm.updated_at
    INTO v_source_updated_at
    FROM global.user_access_hierarchy_mapping uahm
    LEFT JOIN base_pricing.user_access_hierarchy_flat flat
           ON flat.user_code = uahm.user_code
    WHERE uahm.user_code = p_user_code
      AND (flat.updated_at IS NULL OR uahm.updated_at > flat.updated_at)
    ORDER BY flat.updated_at DESC
    LIMIT 1;

    IF v_source_updated_at IS NULL THEN
        RETURN;
    END IF;

    /* -------------------------------------------------------------------
       2️⃣ RESET: Clear existing rows for this user
    ------------------------------------------------------------------- */
    DELETE FROM base_pricing.user_access_hierarchy_flat
    WHERE user_code = p_user_code;

    /* -------------------------------------------------------------------
       3️⃣ INSERT (STEP 1): One JSON object = One row (NAMES ONLY)
    ------------------------------------------------------------------- */
    INSERT INTO base_pricing.user_access_hierarchy_flat (
        user_code,
        acl_code,
        store_hierarchy_name,
        product_hierarchy_name,
        updated_at
    )
    SELECT
        uahm.user_code,
        uahm.acl_code,
        UPPER(
            base_pricing.fn_decode_special_chars(
                h_elem ->> 'store_hierarchy_id'
            )
        ) AS store_hierarchy_name,
        UPPER(
            base_pricing.fn_decode_special_chars(
                h_elem ->> 'product_hierarchy_id'
            )
        ) AS product_hierarchy_name,
        v_source_updated_at
    FROM global.user_access_hierarchy_mapping uahm
    CROSS JOIN LATERAL jsonb_array_elements(uahm.access_hierarchy) h_elem
    WHERE uahm.user_code = p_user_code
      AND uahm.access_hierarchy IS NOT NULL
      AND jsonb_array_length(uahm.access_hierarchy) > 0
      AND h_elem ? 'store_hierarchy_id'
      AND h_elem ? 'product_hierarchy_id'
      -- Filter with ACL codes for 'Base Pricing' application only
      AND uahm.acl_code IN (
          SELECT acl_code
          FROM "global".acl_master
          WHERE application_code IN (
              SELECT application_code
              FROM "global".application_master
              WHERE name = 'Base Pricing'
              AND status = true
          )
          AND status = true
      );

    /* -------------------------------------------------------------------
       4️⃣ UPDATE (STEP 2): Resolve STORE hierarchy IDs
    ------------------------------------------------------------------- */
    UPDATE base_pricing.user_access_hierarchy_flat f
    SET store_hierarchy_id = sm.uam_heirarchy_id
    FROM (
        SELECT DISTINCT ON (uam_heirarchy_name)
               uam_heirarchy_id,
               uam_heirarchy_name
        FROM base_pricing.bp_store_master
    ) sm
    WHERE f.user_code = p_user_code
      AND sm.uam_heirarchy_name = f.store_hierarchy_name;

    /* -------------------------------------------------------------------
       5️⃣ UPDATE (STEP 3): Resolve PRODUCT hierarchy IDs
    ------------------------------------------------------------------- */
    UPDATE base_pricing.user_access_hierarchy_flat f
    SET product_hierarchy_id = pm.uam_heirarchy_id
    FROM (
        SELECT DISTINCT ON (uam_heirarchy_name)
               uam_heirarchy_id,
               uam_heirarchy_name
        FROM base_pricing.bp_product_master
    ) pm
    WHERE f.user_code = p_user_code
      AND pm.uam_heirarchy_name = f.product_hierarchy_name;

END;
$$;
