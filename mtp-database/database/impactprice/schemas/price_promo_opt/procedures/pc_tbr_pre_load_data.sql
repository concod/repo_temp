--liquibase formatted sql
--changeset harshith.mandli@impactanalytics.co:pc_tbr_pre_load_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changes for pc_tbr_pre_load_data

DROP PROCEDURE if exists price_promo_opt.pc_tbr_pre_load_data;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_tbr_pre_load_data(IN p_start_date date, IN p_end_date date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
BEGIN
		
		-- Create Partitons
		CALL price_promo_opt.pc_create_date_partitions('price_promo_opt', 'tbr_product_store_date', 'day', '365 day', 'backwards');

        RAISE NOTICE 'Processing data from % to %', p_start_date, p_end_date;

        -- =========================
        -- 1️ DELETE
        -- =========================
        DELETE FROM price_promo_opt.tbr_product_store_date
        WHERE date BETWEEN p_start_date AND p_end_date;


        -- =========================
        -- 2️ TY ACTUAL
        -- =========================
        INSERT INTO price_promo_opt.tbr_product_store_date (
            product_id,
            store_reco_level,
            date,
			currency_id,
            actual_sales_units,
            actual_revenue,
            actual_margin
        )
        SELECT 
            txn.product_id,
            txn.store_reco_level,
            txn.date_id,
			cr.target_currency_id,
            SUM(COALESCE(txn.quantity,0)),
    		SUM(COALESCE(txn.revenue * cr.planned_conversion_multiplier,0)),
    		SUM(COALESCE(txn.margin * cr.planned_conversion_multiplier,0))
        FROM price_promo_opt.promo_txn_agg txn
        JOIN price_promo.product_master pm
            ON txn.product_id = pm.product_id
        JOIN global.actual_forex_rate cr
            ON cr.date = txn.date_id
           AND cr.source_currency_id = pm.currency_id
        WHERE txn.date_id BETWEEN p_start_date AND p_end_date
        GROUP BY 1,2,3,4
		ON CONFLICT (product_id, store_reco_level, date, currency_id)
        DO UPDATE SET
            actual_sales_units = EXCLUDED.actual_sales_units,
            actual_revenue     = EXCLUDED.actual_revenue,
            actual_margin      = EXCLUDED.actual_margin;


        -- =========================
        -- 3️ LY ACTUAL
        -- =========================
        INSERT INTO price_promo_opt.tbr_product_store_date (
            product_id,
            store_reco_level,
            date,
			currency_id,
            ly_sales_units,
            ly_revenue,
            ly_margin
        )
        SELECT 
            txn.product_id,
            txn.store_reco_level,
            fdm.date_id,
			cr.target_currency_id,
            SUM(COALESCE(txn.quantity,0)),
    		SUM(COALESCE(txn.revenue * cr.planned_conversion_multiplier,0)),
    		SUM(COALESCE(txn.margin * cr.planned_conversion_multiplier,0))
        FROM price_promo_opt.promo_txn_agg txn
        JOIN global.tb_fiscal_date_mapping fdm
            ON txn.date_id = fdm.ly_date
        JOIN price_promo.product_master pm
            ON txn.product_id = pm.product_id
        JOIN global.planned_forex_rate cr
            ON cr.date = txn.date_id
           AND cr.source_currency_id = pm.currency_id
        WHERE 
		fdm.date_id BETWEEN p_start_date AND p_end_date
        GROUP BY 1,2,3,4
        ON CONFLICT (product_id, store_reco_level, date, currency_id)
        DO UPDATE SET
            ly_sales_units = EXCLUDED.ly_sales_units,
            ly_revenue     = EXCLUDED.ly_revenue,
            ly_margin      = EXCLUDED.ly_margin;


        -- =========================
        -- 4️ MFP
        -- =========================
        INSERT INTO price_promo_opt.tbr_product_store_date (
            product_id,
            store_reco_level,
            date,
			currency_id,
            mfp_sales_units,
            mfp_revenue,
            mfp_margin
        )
        SELECT
            mfp.product_id,
            mfp.store_reco_level,
            mfp.dates,
			cr.target_currency_id,
            SUM(COALESCE(mfp.units, 0)), 
            SUM(COALESCE(mfp.revenue * cr.planned_conversion_multiplier,0)),
    		SUM(COALESCE(mfp.margin * cr.planned_conversion_multiplier,0))
        FROM price_promo_opt.tb_budget_master_ty_agg mfp 
        JOIN price_promo.product_master pm
            ON mfp.product_id = pm.product_id
        JOIN global.planned_forex_rate cr
            ON cr.date = mfp.dates
           AND cr.source_currency_id = pm.currency_id
        WHERE mfp.dates BETWEEN p_start_date AND p_end_date
		GROUP BY 1,2,3,4
        ON CONFLICT (product_id, store_reco_level, date, currency_id)
        DO UPDATE SET
            mfp_sales_units = EXCLUDED.mfp_sales_units,
            mfp_revenue     = EXCLUDED.mfp_revenue,
            mfp_margin      = EXCLUDED.mfp_margin;


        -- =========================
        -- 5️ BASELINE FORECAST
        -- =========================
        INSERT INTO price_promo_opt.tbr_product_store_date (
            product_id,
            store_reco_level,
            date,
			currency_id,
            baseline_sales_units,
            baseline_revenue,
            baseline_margin
        )
        SELECT
            sm.product_id, 
            sm.store_reco_level,
            sm.dates, 
			cr.target_currency_id,
            SUM(COALESCE(sm.units, 0)), 
            SUM(COALESCE(sm.revenue * cr.planned_conversion_multiplier,0)),
    		SUM(COALESCE(sm.margin * cr.planned_conversion_multiplier,0))
        FROM price_promo_opt.tb_budget_master_baseline_agg sm
        JOIN price_promo.product_master pm
            ON sm.product_id = pm.product_id
        JOIN global.planned_forex_rate cr
            ON cr.date = sm.dates
           AND cr.source_currency_id = pm.currency_id
        WHERE sm.dates BETWEEN p_start_date AND p_end_date
		GROUP BY 1,2,3,4
        ON CONFLICT (product_id, store_reco_level, date, currency_id)
        DO UPDATE SET
            baseline_sales_units = EXCLUDED.baseline_sales_units,
            baseline_revenue     = EXCLUDED.baseline_revenue,
            baseline_margin      = EXCLUDED.baseline_margin;

		-- =========================
        -- 6 PROMO FORECAST
        -- =========================
        INSERT INTO price_promo_opt.tbr_product_store_date (
            product_id,
            store_reco_level,
            date,
			currency_id,
            promo_sales_units,
            promo_revenue,
            promo_margin
        )
        SELECT
            f.product_id, 
           	f.store_reco_level,
            f.recommendation_date, 
			cr.target_currency_id,
            SUM(COALESCE(f.sales_units, 0)), 
            SUM(COALESCE(f.revenue * cr.planned_conversion_multiplier,0)),
    		SUM(COALESCE(f.margin * cr.planned_conversion_multiplier,0))
        FROM price_promo.ps_recommended_finalized_stack f 
        JOIN price_promo.product_master pm
            ON f.product_id = pm.product_id
        JOIN global.planned_forex_rate cr
            ON cr.date = f.recommendation_date
           AND cr.source_currency_id = pm.currency_id
        WHERE f.recommendation_date BETWEEN p_start_date AND p_end_date
		GROUP BY 1,2,3,4
        ON CONFLICT (product_id, store_reco_level, date, currency_id)
        DO UPDATE SET
            promo_sales_units = EXCLUDED.promo_sales_units,
            promo_revenue     = EXCLUDED.promo_revenue,
            promo_margin      = EXCLUDED.promo_margin;


		RAISE NOTICE 'Completed processing data from % to %', p_start_date, p_end_date;

END;
$procedure$
;