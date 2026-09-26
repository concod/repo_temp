--liquibase formatted sql
--changeset ujjawal.singh@impactanalytics.co:sync_article_inventory_dashboard runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:sync_article_inventory_dashboard
--comment: initial changeset for sync_article_inventory_dashboard_02


DROP PROCEDURE IF EXISTS public.sync_article_inventory_dashboard();

CREATE OR REPLACE PROCEDURE public.sync_article_inventory_dashboard()
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
DECLARE
    _log_code varchar := gen_random_uuid();
    _sp_name  varchar := 'public.sync_article_inventory_dashboard';
    _log_step varchar;
    _st       TIMESTAMP := clock_timestamp();
BEGIN
    -- Start log
    CALL global.data_ingestion_logs(_log_code, _sp_name, 'start', NULL, (clock_timestamp() - _st)::text, NULL);
    PERFORM set_config('local.log_code', _log_code, true);
    PERFORM set_config('local.sp_name', _sp_name, true);

    BEGIN
        _log_step := 'truncate_target';
        DELETE FROM inventory_smart.article_inventory_dashboard;

        _log_step := 'insert_target';

        WITH paf_article_level AS (
            SELECT
                article,
                MAX(l0_name) AS l0_name,
                MAX(l1_name) AS l1_name,
                MAX(l2_name) AS l2_name,
                MAX(l3_name) AS l3_name,
                MAX(l4_name) AS l4_name,
                MAX(l5_name) AS l5_name,
                MAX(collection) AS collection,
                MAX(product_life_cycle) AS product_life_cycle,
                MIN(launch_date) AS launch_date,
                BOOL_OR(clearance) AS clearance,
                MAX(clearance_start_date) AS clearance_start_date
            FROM global.product_attributes_filter
            WHERE active IS TRUE AND COALESCE(is_deleted, FALSE) = FALSE
            GROUP BY article
        )

        INSERT INTO inventory_smart.article_inventory_dashboard (
            l0_name, l1_name, l2_name, l3_name, l4_name, l5_name,
            article, style, style_description, season, gender, collection,
            class, subclass, sty_primary_occsn_end_use_dsc, product_type, launch_date,
            clearance, clearance_flag, planned_clearance_date,
            store_code, store_name, store_grade,
            price, msrp, oh, it, oo, total_inv,
            wtd_units, lw_units, lw_margin, lw_revenue, lw_margin_percentage,
            l4w_units, l4w_revenue, l8w_units, l6m_units,
            discount, promo,
            wos_oh_oo_it, wos_oh_oo, wos_oh_it, wos_oh,
            dc_wos_oh_oo_it, dc_wos_oh_oo, dc_wos_oh,
            stockout, shortfall, excess, normal, article_alert_flag,
            sell_through_perc, ata_eaches, ata_packs, ata, dc_instock, dc_oo,
            in_stock, in_stock_ata, allocated_units,
            in_stock_count, total_count, dc_instock_count, dc_instock_total_count,
            in_stock_dc_ata_count, in_stock_dc_ata_total_count, twos,

            -- NEW COLUMNS
            instock_percentage,
            stock_to_sell_ratio,
            size_integrity_oh,
            size_integrity_oh_it,
            size_integrity_oh_oo_it,

            -- ADDED FORECAST COLUMNS
            forecast_4w,
            forecast_w,
            forecast_8w
        )
        SELECT 
            MAX(pm.l0_name) AS l0_name,
            MAX(pm.l1_name) AS l1_name,
            MAX(pm.l2_name) AS l2_name,
            a.l3_name,
            MAX(pm.l4_name) AS l4_name,
            MAX(pm.l5_name) AS l5_name,
            a.article,
            NULL::varchar AS style,
            NULL::varchar AS style_description,
            NULL::varchar AS season,
            NULL::varchar AS gender,
            MAX(pm.collection) AS collection,
            NULL::varchar AS class,
            NULL::varchar AS subclass,
            NULL::varchar AS sty_primary_occsn_end_use_dsc,
            MAX(pm.product_life_cycle) AS product_type,
            MIN(pm.launch_date) AS launch_date,
            BOOL_OR(pm.clearance) AS clearance,
            CASE WHEN BOOL_OR(pm.clearance) THEN 'Clearance' ELSE 'Non-Clearance' END AS clearance_flag,
            MAX(pm.clearance_start_date) AS planned_clearance_date,
            a.store_code,
            MAX(sm.store_name) AS store_name,
            NULL::varchar AS store_grade,

            AVG(a.price) AS price,
            AVG(a.msrp) AS msrp,
            AVG(a.oh) AS oh,
            AVG(a.it) AS it,
            AVG(a.oo) AS oo,
            AVG(a.total_inv) AS total_inv,
            AVG(a.wtd_units) AS wtd_units,
            AVG(a.lw_units) AS lw_units,
            AVG(a.lw_margin) AS lw_margin,
            AVG(a.lw_revenue) AS lw_revenue,
            AVG(a.lw_margin_percentage) AS lw_margin_percentage,
            AVG(a.l4w_units) AS l4w_units,
            AVG(a.l4w_revenue) AS l4w_revenue,
            AVG(a.l8w_units) AS l8w_units,
            AVG(a.l6m_units) AS l6m_units,
            AVG(a.discount) AS discount,
            NULL::float4 AS promo,
            AVG(a.wos_oh_oo_it) AS wos_oh_oo_it,
            AVG(a.wos_oh_oo) AS wos_oh_oo,
            NULL::float4 AS wos_oh_it,
            AVG(a.wos_oh) AS wos_oh,
            NULL::float4 AS dc_wos_oh_oo_it,
            NULL::float4 AS dc_wos_oh_oo,
            NULL::float4 AS dc_wos_oh,
            AVG(a.stockout) AS stockout,
            AVG(a.shortfall) AS shortfall,
            AVG(a.excess) AS excess,
            AVG(a.normal) AS normal,
            MAX(a.article_alert_flag) AS article_alert_flag,
            AVG(a.sell_through_perc) AS sell_through_perc,
            AVG(a.ata_eaches) AS ata_eaches,
            AVG(a.ata_packs) AS ata_packs,
            AVG(a.ata) AS ata,
            AVG(a.dc_instock) AS dc_instock,
            AVG(a.dc_oo) AS dc_oo,
            SUM(a.in_stock)::float4 AS in_stock,
            AVG(a.in_stock_ata) AS in_stock_ata,
            SUM(a.allocated_units)::float4 AS allocated_units,
            SUM(a.in_stock_count) AS in_stock_count,
            SUM(a.total_count) AS total_count,
            SUM(a.dc_instock_count) AS dc_instock_count,
            SUM(a.dc_instock_total_count) AS dc_instock_total_count,
            SUM(a.in_stock_dc_ata_count) AS in_stock_dc_ata_count,
            SUM(a.in_stock_dc_ata_total_count) AS in_stock_dc_ata_total_count,
            NULL::float4 AS twos,

            -- NEW COLUMNS (coming from source public.article_inventory_dashboard)
            AVG(a.instock_percentage)      AS instock_percentage,
            AVG(a.stock_to_sell_ratio)     AS stock_to_sell_ratio,
            AVG(a.size_integrity_oh)       AS size_integrity_oh,
            AVG(a.size_integrity_oh_it)    AS size_integrity_oh_it,
            AVG(a.size_integrity_oh_oo_it) AS size_integrity_oh_oo_it,

            -- ADDED FORECAST COLUMNS (coming from source public.article_inventory_dashboard)
            AVG(a.forecast_4w) AS forecast_4w,
            AVG(a.forecast_w) AS forecast_w,
            AVG(a.forecast_8w) AS forecast_8w
        FROM public.article_inventory_dashboard a
        JOIN paf_article_level pm USING (article)
        JOIN global.store_attributes_filter sm USING (store_code)
        GROUP BY a.article, a.store_code, a.l3_name;

        -- End log
        CALL global.data_ingestion_logs(_log_code, _sp_name, 'end', NULL, (clock_timestamp() - _st)::text, NULL);

    EXCEPTION
        WHEN OTHERS THEN
            CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, NULL);
            RAISE EXCEPTION 'Error occurred in the procedure: %', SQLERRM;
    END;
END;
$procedure$;

