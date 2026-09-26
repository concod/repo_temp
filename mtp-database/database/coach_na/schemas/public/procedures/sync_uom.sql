--liquibase formatted sql
--changeset liquibase:sync_uom runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_uom
--rollback: SELECT 1
-- Drop the old procedure if it exists
DROP PROCEDURE IF EXISTS public.sync_uom;

CREATE OR REPLACE procedure public.sync_uom()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    _log_code varchar := gen_random_uuid();
    _sp_name varchar := 'inventory_smart.sync_uom'; 
    _log_step varchar;
    _st TIMESTAMP := clock_timestamp();
    _query text;
BEGIN
    CALL global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
    PERFORM set_config('local.log_code', _log_code, true);
    PERFORM set_config('local.sp_name', _sp_name, true);
    BEGIN
        _log_step := 'Executing Insert Query with ON CONFLICT DO NOTHING';
        INSERT INTO inventory_smart.uom (
            from_unit_description,
            factor,
            to_unit_description,
            item_id,
            from_unit,
            to_unit,
            date,
            article,
            store_code
        )
WITH paf AS (
    SELECT
        paf.l0_name,
        paf.l1_name,
        paf.l2_name,
        paf.l3_name,
        paf.article,
        paf.size AS retail_size_cd,
        paf.product_code
    FROM global.product_attributes_filter paf
    JOIN inventory_smart.article_status_tag ast
        ON paf.product_code = ast.product_code
    WHERE paf.active = true
      AND ast.article_status_tag NOT IN ('', 'Old')
),

filtered_products AS (
    SELECT DISTINCT
        p.l0_name,
        p.l1_name,
        p.l2_name,
        p.l3_name,
        p.article,
        p.retail_size_cd,
        p.product_code
    FROM paf p
    JOIN inventory_smart.dc_pack_configuration dpc
        ON p.product_code = dpc.product_code
    WHERE dpc.pack_type = 'eaches'
       OR p.product_code LIKE 'KC829 PIN%M%'
       OR p.product_code LIKE 'KC829 PIN%L%'
),

filtered_stores AS (
    SELECT DISTINCT
        channel,
        store_code,
        s0_name
    FROM global.store_attributes_filter
    WHERE (cust_type = 'PS' or s0_name='Coach')
      AND active = true
),

product_store_base AS (
    SELECT
        p.*,
        s.store_code
    FROM filtered_products p
    JOIN filtered_stores s
        ON p.l1_name = s.channel
       AND p.l0_name = s.s0_name
    WHERE NOT EXISTS (
        SELECT 1
        FROM inventory_smart.uom t
        WHERE t.item_id = p.product_code
          AND t.store_code = s.store_code
    )
) --select * from product_store_base,
,
min_stock_constraints AS (
    SELECT
        product_code,
        store_code,
        min_stock::int4 AS min_stock_val
    FROM inventory_smart.final_result_table
    WHERE min_stock > 0
),

KS_final AS (
    SELECT
        'Cases' AS from_unit_description,
        CASE
            WHEN a.l0_name='KateSpade' and a.l1_name = 'Retail-Store'
                 AND COALESCE(c.min_stock_val, 0) <= 0 THEN 1
            WHEN a.l0_name='KateSpade' and a.l1_name = 'Retail-Store'
                 AND c.min_stock_val > 0 THEN c.min_stock_val
            WHEN a.l1_name = 'Outlet-Store'
                 AND a.l2_name = 'KS JEWELRY' THEN 3
            WHEN a.l1_name = 'Outlet-Store'
                 AND a.l2_name = 'KS ACCESSORIES'
                 AND a.l3_name IN ('EYEWEAR','SUNGLASSES') THEN 2
            WHEN a.l1_name = 'Outlet-Store'
                 AND a.l2_name = 'KS ACCESSORIES'
                 AND a.l3_name = 'FRAGRANCE' THEN 3
            WHEN a.l1_name = 'Outlet-Store'
                 AND a.l2_name = 'KS TECH' THEN 3
            WHEN a.l1_name = 'Outlet-Store'
                 AND a.l2_name IN ('KS HANDBAGS','KS SMALL GOODS','KS SLG''S') THEN 4
            WHEN a.product_code LIKE 'KC829 PIN % M%'
                 AND a.l1_name = 'Outlet-Store' THEN 300
            WHEN a.product_code LIKE 'KC829 PIN % L%'
                 AND a.l1_name = 'Outlet-Store' THEN 200
            WHEN a.product_code LIKE 'KI169 PIN %'
                 AND a.l1_name = 'Outlet-Store' THEN 50
            WHEN a.product_code LIKE 'KN153 CRM %'
                 AND a.l1_name = 'Outlet-Store' THEN 50
            WHEN a.article ='CH555 MTI-Retail-Store' THEN 24
            WHEN a.article ='223   MTI-Retail-Store' THEN 24
            WHEN a.article ='224   MTI-Retail-Store' THEN 24
            WHEN a.article ='225   MTI-Retail-Store' THEN 18
            WHEN a.article ='C1457 MTI-Retail-Store' THEN 12
            ELSE 1
        END AS factor,
        'Each' AS to_unit_description,
        a.product_code AS item_id,
        'CS' AS from_unit,
        'EA' AS to_unit,
        CURRENT_DATE AS date,
        a.article,
        a.store_code
    FROM product_store_base a
    LEFT JOIN min_stock_constraints c
        ON a.product_code = c.product_code
       AND a.store_code = c.store_code
)
SELECT *
FROM KS_final
    
        ON CONFLICT (item_id, store_code) DO NOTHING;
        CALL global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
    EXCEPTION
        WHEN OTHERS THEN
            CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            RAISE EXCEPTION 'Error occurred in the procedure %: %', _sp_name, SQLERRM;
    END;
END
$procedure$;
