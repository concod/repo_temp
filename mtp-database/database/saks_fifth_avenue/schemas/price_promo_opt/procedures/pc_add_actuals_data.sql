--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_add_actuals_data_v261124 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_add_actuals_data_v2.3

DROP PROCEDURE IF EXISTS price_promo_opt.pc_add_actuals_data(date);

CREATE OR REPLACE PROCEDURE price_promo_opt.pc_add_actuals_data(IN var_date date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    promo_txn_table TEXT;
    fin_table TEXT;
    query TEXT;
BEGIN
    -- Define promo_txn_table based on the input date
    promo_txn_table := CONCAT('promo_txn_', TO_CHAR(var_date, 'yyyymmdd'));

    --Drop statements for the temporary tables
	EXECUTE FORMAT('DROP TABLE IF EXISTS price_promo_opt_temp.fin;');
	EXECUTE FORMAT('DROP TABLE IF EXISTS price_promo_opt_temp.fin_override;');
	EXECUTE FORMAT('DROP TABLE IF EXISTS price_promo_opt_temp.fin_stack;');
	EXECUTE FORMAT('DROP TABLE IF EXISTS price_promo_opt_temp.fin_stack_override;');
	EXECUTE FORMAT('DROP TABLE IF EXISTS price_promo_opt_temp.ps_reco_actuals_temp1;');
	EXECUTE FORMAT('DROP TABLE IF EXISTS price_promo_opt_temp.ps_reco_actuals_temp2;');

    -- Create unlogged table fin
    EXECUTE FORMAT('
        CREATE UNLOGGED TABLE price_promo_opt_temp.fin AS
        SELECT event_id, promo_id, product_id, recommendation_date, s0_id, s1_id,
				discount_level_value, offer_type_id, created_by, updated_by, created_at, updated_at,
				baseline_sales_units, baseline_revenue, baseline_margin, contribution_revenue, contribution_margin
				sales_units, revenue, margin
        FROM price_promo.ps_recommended_finalized
        WHERE recommendation_date = %L;', var_date);

    -- Create index on fin
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_fin_promo_product ON price_promo_opt_temp.fin (promo_id, product_id);';

    -- Create unlogged table fin_override
    EXECUTE FORMAT('
        CREATE UNLOGGED TABLE price_promo_opt_temp.fin_override AS
        SELECT promo_id, product_id, recommendation_date, s0_id, s1_id,
               baseline_sales_units, baseline_revenue, baseline_margin,
			   sales_units, revenue, margin, contribution_revenue, contribution_margin
        FROM price_promo.ps_recommended_finalized_override
        WHERE recommendation_date = %L;', var_date);

    -- Create index on fin_override
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_fin_override_promo_product ON price_promo_opt_temp.fin_override (promo_id, product_id);';

    -- Create unlogged table fin_stack
    EXECUTE FORMAT('
        CREATE UNLOGGED TABLE price_promo_opt_temp.fin_stack AS
        SELECT unnest_promo_id AS promo_id, product_id, recommendation_date, s0_id, s1_id,
               baseline_sales_units, baseline_revenue, baseline_margin,
               pos_baseline_sales_units, pos_baseline_revenue, pos_baseline_margin,
			   sales_units, revenue, margin, contribution_revenue, contribution_margin
        FROM price_promo.ps_recommended_finalized_stack,
             LATERAL UNNEST(promo_ids) AS unnest_promo_id
        WHERE recommendation_date = %L;', var_date);

    -- Create index on fin_stack
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_fin_stack_promo_product ON price_promo_opt_temp.fin_stack (promo_id, product_id);';

    -- Create unlogged table fin_stack_override
    EXECUTE FORMAT('
        CREATE UNLOGGED TABLE price_promo_opt_temp.fin_stack_override AS
        SELECT unnest_promo_id AS promo_id, product_id, recommendation_date, s0_id, s1_id,
               baseline_sales_units, baseline_revenue, baseline_margin,
               pos_baseline_sales_units, pos_baseline_revenue, pos_baseline_margin,
			   sales_units, revenue, margin, contribution_revenue, contribution_margin
        FROM price_promo.ps_recommended_finalized_stack_override,
             LATERAL UNNEST(promo_ids) AS unnest_promo_id
        WHERE recommendation_date = %L;', var_date);

    -- Create index on fin_stack_override
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_fin_stack_override_promo_product ON price_promo_opt_temp.fin_stack_override (promo_id, product_id);';



   -- Create temporary table for actuals data
    EXECUTE FORMAT('
        CREATE UNLOGGED TABLE price_promo_opt_temp.ps_reco_actuals_temp1 AS
        SELECT
            product_id, date_id, s0_id, s1_id,
            AVG(COALESCE(aum, 0)) AS aum,
            AVG(COALESCE(aur, 0)) AS aur,
            SUM(COALESCE(margin, 0)) AS margin,
            SUM(COALESCE(revenue, 0)) AS revenue,
            SUM(COALESCE(quantity, 0)) AS quantity,
            AVG(COALESCE(final_price, 0)) AS final_price,
            AVG(COALESCE(cost, 0)) AS cost,
            AVG(COALESCE(base_price, 0)) AS base_price,
			AVG(COALESCE(final_discount_percent, 0)) AS final_discount_percent,
            SUM(COALESCE(promo_discount, 0)) AS promo_discount,
            SUM(COALESCE(app_gross_margin, 0)) AS app_gross_margin,
            SUM(COALESCE(app_gross_revenue, 0)) AS app_gross_revenue,
            SUM(COALESCE(app_gross_quantity, 0)) AS app_gross_quantity,
            SUM(COALESCE(loy_gross_margin, 0)) AS loy_gross_margin,
            SUM(COALESCE(loy_gross_revenue, 0)) AS loy_gross_revenue,
            SUM(COALESCE(loy_gross_quantity, 0)) AS loy_gross_quantity
        FROM price_promo.%I
        WHERE no_of_txn > 0
        GROUP BY 1, 2, 3, 4;', promo_txn_table);

    -- Create index on ps_reco_actuals_temp1
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_ps_reco_actuals_temp1_promo_product ON price_promo_opt_temp.ps_reco_actuals_temp1 (product_id, s1_id);';

    -- Create temporary table for detailed actuals data
    EXECUTE FORMAT('
        CREATE UNLOGGED TABLE price_promo_opt_temp.ps_reco_actuals_temp2 AS
        SELECT
            promo_id, product_id, recommendation_date, s0_id, s1_id,
            prm.offer_distribution_channel, prm.customer_type, prm.is_default,
            bm.gross_shipped_rate, bm.return_rate, bm.net_gm_buffer_percent,
            bm.variable_sales_percent, bm.marketing_cost_percent, bm.fulfilment_cost_dollar,
            COALESCE(txn.final_discount_percent, 0) AS effective_discount,
			COALESCE(txn.promo_discount, 0) AS promo_spend,
            COALESCE(txn.base_price, 0) AS original_price,
            COALESCE(txn.cost, 0) AS original_cost,
            COALESCE(txn.final_price, 0) AS discounted_price,
            COALESCE(CASE
                        WHEN offer_distribution_channel = 1 THEN txn.app_gross_quantity
                        WHEN customer_type = 0 AND offer_distribution_channel = 0 THEN txn.loy_gross_quantity
                        ELSE txn.quantity
                    END, 0) AS sales_units,
            COALESCE(CASE
                        WHEN offer_distribution_channel = 1 THEN txn.app_gross_revenue
                        WHEN customer_type = 0 AND offer_distribution_channel = 0 THEN txn.loy_gross_revenue
                        ELSE txn.revenue
                    END, 0) AS revenue,
            COALESCE(CASE
                        WHEN offer_distribution_channel = 1 THEN txn.app_gross_margin
                        WHEN customer_type = 0 AND offer_distribution_channel = 0 THEN txn.loy_gross_margin
                        ELSE txn.margin
                    END, 0) AS margin,
            COALESCE(txn.aur, 0) AS aur,
            COALESCE(txn.aum, 0) AS aum
        FROM price_promo_opt.current_finalized_promo_products fp
        LEFT JOIN (SELECT a.promo_id, offer_distribution_channel, customer_type,
                          COALESCE(is_default, false) AS is_default
                   FROM price_promo.promo_master a
                   LEFT JOIN price_promo.tb_promo_override_forecast b
                   ON a.promo_id = b.promo_id AND a.last_approved_scenario_id = b.scenario_id) AS prm
        USING (promo_id)
        LEFT JOIN price_promo_opt_temp.ps_reco_actuals_temp1 txn
        USING (product_id, s0_id, s1_id)
        LEFT JOIN price_promo_opt.tb_business_metrics_config_opt bm
        USING (s0_id, s1_id);');

    -- Create index on ps_reco_actuals_temp2
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_ps_reco_actuals_temp2_promo_product ON price_promo_opt_temp.ps_reco_actuals_temp2 (promo_id, product_id);';


    CALL price_promo_opt.pc_create_date_partitions('price_promo', 'ps_recommended_actuals', 'day', '14 day', 'backwards');

    DELETE FROM price_promo.ps_recommended_actuals
    WHERE recommendation_date = var_date;


    EXECUTE FORMAT(
    'INSERT INTO price_promo.ps_recommended_actuals (
        event_id, promo_id, product_id, recommendation_date, s0_id, s1_id,
        discount_level_value, offer_type_id, created_by, updated_by, created_at, updated_at,
        effective_discount, original_price, original_cost, discounted_price,
        promo_spend, sales_units, baseline_sales_units, incremental_sales_units,
        revenue, baseline_revenue, incremental_revenue,
        margin, baseline_margin, incremental_margin, aur, aum,
        contribution_revenue, contribution_margin,
		f_baseline_sales_units, f_baseline_revenue, f_baseline_margin,
		fo_baseline_sales_units, fo_baseline_revenue, fo_baseline_margin,
		fs_baseline_sales_units, fs_baseline_revenue, fs_baseline_margin,
		fs_pos_baseline_sales_units, fs_pos_baseline_revenue, fs_pos_baseline_margin,
		fso_baseline_sales_units, fso_baseline_revenue, fso_baseline_margin,
		fso_pos_baseline_sales_units, fso_pos_baseline_revenue, fso_pos_baseline_margin
    )
    (
        SELECT
            event_id, promo_id, product_id, txn.recommendation_date, s0_id, s1_id,
            f.discount_level_value, f.offer_type_id, f.created_by, f.updated_by, f.created_at, f.updated_at,

            txn.effective_discount, txn.original_price, txn.original_cost, txn.discounted_price, txn.promo_spend,
            txn.sales_units,
            COALESCE(CASE WHEN is_default = FALSE THEN fs.baseline_sales_units ELSE fso.baseline_sales_units END, 0) AS baseline_sales_units,
            COALESCE(txn.sales_units, 0) - COALESCE(CASE WHEN is_default = FALSE THEN fs.baseline_sales_units ELSE fso.baseline_sales_units END, 0) AS incremental_sales_units,

			txn.revenue,
            COALESCE(CASE WHEN is_default = FALSE THEN fs.baseline_revenue ELSE fso.baseline_revenue END, 0) AS baseline_revenue,
            COALESCE(txn.revenue, 0) - COALESCE(CASE WHEN is_default = FALSE THEN fs.baseline_revenue ELSE fso.baseline_revenue END, 0) AS incremental_revenue,

			txn.margin,
            COALESCE(CASE WHEN is_default = FALSE THEN fs.baseline_margin ELSE fso.baseline_margin END, 0) AS baseline_margin,
            COALESCE(txn.margin, 0) - COALESCE(CASE WHEN is_default = FALSE THEN fs.baseline_margin ELSE fso.baseline_margin END, 0) AS incremental_margin,
            txn.aur,
            txn.aum,

       		COALESCE(ROUND((txn.revenue * gross_shipped_rate / 100 * (1 - return_rate / 100))::NUMERIC, 2), 0) AS contribution_revenue,
	        COALESCE(
			    ROUND(
			        (
						(
				            txn.revenue * gross_shipped_rate / 100 * (1 - return_rate / 100) *
				            (
				                (txn.margin / NULLIF(txn.revenue, 0)) - (net_gm_buffer_percent / 100)
				                - (variable_sales_percent / 100) - (marketing_cost_percent / 100)
				            )
				        )
				        -
						(txn.sales_units * fulfilment_cost_dollar)
				   )::NUMERIC, 2
			    ), 0
			) AS contribution_margin,

		f.baseline_sales_units, f.baseline_revenue, f.baseline_margin,
		fo.baseline_sales_units, fo.baseline_revenue, fo.baseline_margin,
		fs.baseline_sales_units, fs.baseline_revenue, fs.baseline_margin,
		fs.pos_baseline_sales_units, fs.pos_baseline_revenue, fs.pos_baseline_margin,
		fso.baseline_sales_units, fso.baseline_revenue, fso.baseline_margin,
		fso.pos_baseline_sales_units, fso.pos_baseline_revenue, fso.pos_baseline_margin

        FROM
            price_promo_opt_temp.ps_reco_actuals_temp2 txn
        LEFT JOIN
			 price_promo_opt_temp.fin f USING (promo_id, product_id, s0_id, s1_id)
		LEFT JOIN
			 price_promo_opt_temp.fin_override fo USING (promo_id, product_id, s0_id, s1_id)
		LEFT JOIN
			 price_promo_opt_temp.fin_stack fs USING (promo_id, product_id, s0_id, s1_id)
		LEFT JOIN
			 price_promo_opt_temp.fin_stack_override fso USING (promo_id, product_id, s0_id, s1_id)

        WHERE COALESCE(f.sales_units, 0) > 0
            OR COALESCE(txn.sales_units, 0) > 0
    );');

END;
$procedure$
;
