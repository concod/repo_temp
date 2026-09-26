--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_add_actuals_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_add_actuals_data

DROP PROCEDURE if exists price_promo_opt.pc_add_actuals_data;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_add_actuals_data(IN var_date date, IN customer_flag integer DEFAULT 0)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    promo_txn_table TEXT;
    fin_table TEXT;
    query TEXT;
	customer_select TEXT;
	customer_join TEXT;
BEGIN
    -- Define promo_txn_table based on the input date
    promo_txn_table := CONCAT('promo_txn_', TO_CHAR(var_date, 'yyyymmdd')); 

	IF customer_flag = 1 THEN
        customer_select := 'customer_reco_level,';
		customer_join := 'product_id, store_reco_level, customer_reco_level';
    ELSE
        customer_select := '';
		customer_join := 'product_id, store_reco_level';
    END IF;

    --Drop statements for the temporary tables
	EXECUTE FORMAT('DROP TABLE IF EXISTS price_promo_opt_temp.fin;');
	EXECUTE FORMAT('DROP TABLE IF EXISTS price_promo_opt_temp.fin_override;');
	EXECUTE FORMAT('DROP TABLE IF EXISTS price_promo_opt_temp.fin_stack;');
	EXECUTE FORMAT('DROP TABLE IF EXISTS price_promo_opt_temp.fin_stack_override;');
	EXECUTE FORMAT('DROP TABLE IF EXISTS price_promo_opt_temp.ps_reco_actuals_temp;');

    -- Create unlogged table fin
    query:= FORMAT('
        CREATE UNLOGGED TABLE price_promo_opt_temp.fin AS
        SELECT event_id, promo_id, product_id, recommendation_date,
				store_reco_level, 
				%s
				----------------
--				currency_id,
				MAX(vat_percentage) AS vat_percentage,
				----------------
				MAX(discount_level_value) AS discount_level_value, MAX(offer_type_id) AS offer_type_id, 
				MAX(created_by) AS created_by, MAX(updated_by) AS updated_by, MAX(created_at) AS created_at, MAX(updated_at) AS updated_at,
				SUM(baseline_sales_units) AS baseline_sales_units, SUM(baseline_revenue) AS baseline_revenue, SUM(baseline_margin) AS baseline_margin,
--				contribution_revenue, contribution_margin,
				SUM(sales_units) AS sales_units, SUM(revenue) AS revenue, SUM(margin) AS margin
        FROM price_promo.ps_recommended_finalized
        WHERE recommendation_date = %L
		GROUP BY %s;', 
		customer_select,
		var_date,
		CASE WHEN customer_flag = 1 THEN '1, 2, 3, 4, 5, 6' ELSE '1, 2, 3, 4, 5' END);

	RAISE NOTICE 'Executing query: %', query;
	EXECUTE query;

    -- Create index on fin
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_fin_promo_product ON price_promo_opt_temp.fin (promo_id, product_id);';

    -- Create unlogged table fin_override
    query:= FORMAT('
        CREATE UNLOGGED TABLE price_promo_opt_temp.fin_override AS
        SELECT promo_id, product_id, recommendation_date,
				store_reco_level, 
				%s
--				currency_id, vat_percentage,
               SUM(baseline_sales_units) AS baseline_sales_units, SUM(baseline_revenue) AS baseline_revenue, SUM(baseline_margin) AS baseline_margin,
			   SUM(sales_units) AS sales_units, SUM(revenue) AS revenue, SUM(margin) AS margin,
			   SUM(contribution_revenue) AS contribution_revenue, SUM(contribution_margin) AS contribution_margin
        FROM price_promo.ps_recommended_finalized_override
        WHERE recommendation_date = %L
		GROUP BY %s;', 
		customer_select,
		var_date,
		CASE WHEN customer_flag = 1 THEN '1, 2, 3, 4, 5' ELSE '1, 2, 3, 4' END);

	RAISE NOTICE 'Executing query: %', query;
	EXECUTE query;

    -- Create index on fin_override
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_fin_override_promo_product ON price_promo_opt_temp.fin_override (promo_id, product_id);';

    -- Create unlogged table fin_stack
    query:= FORMAT('
        CREATE UNLOGGED TABLE price_promo_opt_temp.fin_stack AS
        SELECT unnest_promo_id AS promo_id, product_id, recommendation_date,
				store_reco_level, 
				%s
--				currency_id, vat_percentage,
				SUM(baseline_sales_units) AS baseline_sales_units, SUM(baseline_revenue) AS baseline_revenue, SUM(baseline_margin) AS baseline_margin,
--             , pos_baseline_sales_units, pos_baseline_revenue, pos_baseline_margin,
			   SUM(sales_units) AS sales_units, SUM(revenue) AS revenue, SUM(margin) AS margin,
			   SUM(contribution_revenue) AS contribution_revenue, SUM(contribution_margin) AS contribution_margin,
			   SUM(promo_spend) AS promo_spend, SUM(coupon_spend) AS coupon_spend
        FROM price_promo.ps_recommended_finalized_stack,
             LATERAL UNNEST(promo_ids) AS unnest_promo_id
        WHERE recommendation_date = %L
		GROUP BY %s;',
		customer_select,
		var_date,
		CASE WHEN customer_flag = 1 THEN '1, 2, 3, 4, 5' ELSE '1, 2, 3, 4' END);

	RAISE NOTICE 'Executing query: %', query;
	EXECUTE query;

    -- Create index on fin_stack
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_fin_stack_promo_product ON price_promo_opt_temp.fin_stack (promo_id, product_id);';

    -- Create unlogged table fin_stack_override
    query:= FORMAT('
        CREATE UNLOGGED TABLE price_promo_opt_temp.fin_stack_override AS
        SELECT unnest_promo_id AS promo_id, product_id, recommendation_date,
				store_reco_level,
				%s
--				currency_id, vat_percentage,
				SUM(baseline_sales_units) AS baseline_sales_units, SUM(baseline_revenue) AS baseline_revenue, SUM(baseline_margin) AS baseline_margin,
--             , pos_baseline_sales_units, pos_baseline_revenue, pos_baseline_margin,
			   SUM(sales_units) AS sales_units, SUM(revenue) AS revenue, SUM(margin) AS margin,
			   SUM(contribution_revenue) AS contribution_revenue, SUM(contribution_margin) AS contribution_margin,
			   SUM(promo_spend) AS promo_spend, SUM(coupon_spend) AS coupon_spend
        FROM price_promo.ps_recommended_finalized_stack_override,
             LATERAL UNNEST(promo_ids) AS unnest_promo_id
        WHERE recommendation_date = %L
		GROUP BY %s;', 
		customer_select,
		var_date,
		CASE WHEN customer_flag = 1 THEN '1, 2, 3, 4, 5' ELSE '1, 2, 3, 4' END);

	RAISE NOTICE 'Executing query: %', query;
	EXECUTE query;

    -- Create index on fin_stack_override
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_fin_stack_override_promo_product ON price_promo_opt_temp.fin_stack_override (promo_id, product_id);';

	query :=  FORMAT('
        CREATE UNLOGGED TABLE price_promo_opt_temp.ps_reco_actuals_temp AS
        SELECT
            ppp.promo_id,
            ppp.product_id, 
            ppp.store_reco_level, 
			%s
            ppp.recommendation_date, 
            prm.offer_distribution_channel, prm.is_default, prm.customer_type,

			---- bm cols made NULL ----
            NULL :: numeric as gross_shipped_rate, NULL  :: numeric as return_rate, NULL  :: numeric as net_gm_buffer_percent,
            NULL  :: numeric as variable_sales_percent, NULL  :: numeric as marketing_cost_percent, NULL  :: numeric as fulfilment_cost_dollar,
			---- bm cols made NULL ---- 

            SUM(COALESCE(margin, 0)) AS margin,
            SUM(COALESCE(revenue, 0)) AS revenue,
            SUM(COALESCE(quantity, 0)) AS sales_units,

            AVG(COALESCE(cost, 0)) AS original_cost,
            AVG(COALESCE(promo_base_price, 0)) AS original_price,
			SUM(COALESCE(txn.promo_discount, 0) + COALESCE(txn.coupon_discount, 0)) AS effective_discount,
            SUM(COALESCE(txn.promo_spend,0)) AS promo_spend,
			SUM(COALESCE(txn.coupon_spend,0)) AS coupon_spend,
			AVG(COALESCE(txn.selling_price, 0)) AS discounted_price

        FROM price_promo_opt.current_finalized_promo_products ppp
		LEFT JOIN  price_promo_opt.%I txn
		USING (%s)

        LEFT JOIN 
			  (
				SELECT a.promo_id, offer_distribution_channel, customer_type,
                COALESCE(is_default, false) AS is_default
                FROM price_promo.promo_master a
                LEFT JOIN price_promo.tb_promo_override_forecast b
                ON a.promo_id = b.promo_id AND a.last_approved_scenario_id = b.scenario_id
			   ) AS prm USING (promo_id)

		--WHERE no_of_txn > 0
        GROUP BY %s;', 
		CASE WHEN customer_flag = 1 THEN 'ppp.customer_reco_level,' ELSE '' END,
		promo_txn_table, 
		customer_join,
		CASE WHEN customer_flag = 1 THEN '1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14' ELSE '1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13' END);

	RAISE NOTICE 'Executing query: %', query;
	EXECUTE query;

	-- Create index on ps_reco_actuals_temp
	EXECUTE 'CREATE INDEX IF NOT EXISTS idx_ps_reco_actuals_temp_promo_product ON price_promo_opt_temp.ps_reco_actuals_temp (promo_id, product_id);';

    CALL price_promo_opt.pc_create_date_partitions('price_promo', 'ps_recommended_actuals', 'day', '14 day', 'backwards');

    DELETE FROM price_promo.ps_recommended_actuals
    WHERE recommendation_date = var_date;

 	query:= FORMAT(
    'INSERT INTO price_promo.ps_recommended_actuals (
        event_id, promo_id, product_id, recommendation_date, 
		store_reco_level, %s
        discount_level_value, offer_type_id, created_by, updated_by, created_at, updated_at,
        effective_discount, original_price, original_cost, discounted_price,
        promo_spend, sales_units, baseline_sales_units, incremental_sales_units,
        revenue, baseline_revenue, incremental_revenue,
        margin, baseline_margin, incremental_margin, 
--      aur, aum,
		currency_id,
		vat_percentage,
--		promo_spend,
		coupon_spend,
--      extended_discount, 
--		final_spend,
        contribution_revenue, contribution_margin
--		f_baseline_sales_units, f_baseline_revenue, f_baseline_margin,
--		fo_baseline_sales_units, fo_baseline_revenue, fo_baseline_margin,
--		fs_baseline_sales_units, fs_baseline_revenue, fs_baseline_margin,
--		fs_pos_baseline_sales_units, fs_pos_baseline_revenue, fs_pos_baseline_margin,
--		fso_baseline_sales_units, fso_baseline_revenue, fso_baseline_margin
--		fso_pos_baseline_sales_units, fso_pos_baseline_revenue, fso_pos_baseline_margin
    )
    (
        SELECT
            f.event_id, txn.promo_id, product_id, txn.recommendation_date, 
			-- 1 s0_id, 1 s1_id,
			store_reco_level, %s
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
--          txn.aur,
--          txn.aum,
			pm.currency_id,
			f.vat_percentage,
--			COALESCE(txn.promo_spend, 0) AS promo_spend,
			COALESCE(txn.coupon_spend, 0) AS coupon_spend,
--			COALESCE(txn.extended_discount, 0) AS extended_discount,
--			COALESCE(txn.final_spend, 0) AS final_spend,
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
			) AS contribution_margin
--			f.baseline_sales_units, f.baseline_revenue, f.baseline_margin,
--			fo.baseline_sales_units, fo.baseline_revenue, fo.baseline_margin,
--			fs.baseline_sales_units, fs.baseline_revenue, fs.baseline_margin,
--			fs.pos_baseline_sales_units, fs.pos_baseline_revenue, fs.pos_baseline_margin,
--			fso.baseline_sales_units, fso.baseline_revenue, fso.baseline_margin
--			fso.pos_baseline_sales_units, fso.pos_baseline_revenue, fso.pos_baseline_margin

        FROM
--            price_promo_opt_temp.ps_reco_actuals_temp2 txn
			price_promo_opt_temp.ps_reco_actuals_temp txn
        LEFT JOIN 
		-- ALL joins at store_hierarchy
			 price_promo_opt_temp.fin f USING (promo_id, %s)
		LEFT JOIN
			 price_promo_opt_temp.fin_override fo USING (promo_id, %s)
		LEFT JOIN
			 price_promo_opt_temp.fin_stack fs USING (promo_id, %s)
		LEFT JOIN
			 price_promo_opt_temp.fin_stack_override fso USING (promo_id, %s)
		LEFT JOIN
			 price_promo.promo_master pm USING (promo_id)
        WHERE COALESCE(f.sales_units, 0) > 0
            OR COALESCE(txn.sales_units, 0) > 0
    );', customer_select, customer_select, customer_join, customer_join, customer_join, customer_join);

	RAISE NOTICE 'Executing query: %', query;
	EXECUTE query;
END;
$procedure$
;

