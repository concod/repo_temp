--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_add_actuals_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_add_actuals_data

DROP PROCEDURE IF EXISTS price_promo_opt.pc_add_actuals_data ;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_add_actuals_data(IN var_date date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    promo_txn_table TEXT;
    fin_table TEXT;
    query TEXT;
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    duration INTERVAL;
    step_start_time TIMESTAMP;
BEGIN
    start_time := clock_timestamp();
    RAISE NOTICE '=== STARTING pc_add_actuals_data for date: % ===', var_date;
    
    -- Define promo_txn_table based on the input date
    promo_txn_table := CONCAT('promo_txn_', TO_CHAR(var_date, 'yyyymmdd'));

    -- Step 1: Drop temporary tables
    RAISE NOTICE 'Step 1: Dropping temporary tables';
    step_start_time := clock_timestamp();
	EXECUTE FORMAT('DROP TABLE IF EXISTS price_promo_opt_temp.fin;');
	EXECUTE FORMAT('DROP TABLE IF EXISTS price_promo_opt_temp.fin_override;');
	EXECUTE FORMAT('DROP TABLE IF EXISTS price_promo_opt_temp.fin_stack;');
	EXECUTE FORMAT('DROP TABLE IF EXISTS price_promo_opt_temp.fin_stack_override;');
	EXECUTE FORMAT('DROP TABLE IF EXISTS price_promo_opt_temp.ps_reco_actuals_temp;');
    end_time := clock_timestamp();
    duration := end_time - step_start_time;
    RAISE NOTICE 'Step 1 COMPLETED: Drop tables took: %', duration;

    -- Step 2: Create unlogged table fin
    RAISE NOTICE 'Step 2: Creating unlogged table fin';
    step_start_time := clock_timestamp();
    query := FORMAT('
        CREATE UNLOGGED TABLE price_promo_opt_temp.fin AS
        SELECT event_id, promo_id, product_id, recommendation_date, 
				store_hierarchy, cm.customer_id,
				----------------
				max(currency_id) as currency_id,-- vat_percentage,
				----------------
				max(discount_level_value) as discount_level_value, max(offer_type_id) as offer_type_id, max(created_by) as created_by, 
				max(updated_by) as updated_by, max(created_at) as created_at, max(updated_at) as updated_at,
				sum(baseline_sales_units) as baseline_sales_units, sum(baseline_revenue) as baseline_revenue, sum(baseline_margin) baseline_margin, 
				sum(contribution_revenue) as contribution_revenue, sum(contribution_margin) as contribution_margin,
				sum(sales_units) as sales_units, sum(revenue) as revenue, sum(margin) as margin
        FROM price_promo.ps_recommended_finalized prf 
        inner join global.customer_master cm on prf.customer_id = cm.c2_id
        where recommendation_date = %L
        group by 1,2,3,4,5,6
        ;

', var_date);
        RAISE NOTICE 'Executing : %', query;
        EXECUTE query;
    end_time := clock_timestamp();
    duration := end_time - step_start_time;
    RAISE NOTICE 'Step 2 COMPLETED: Create table fin took: %', duration;

    -- Create index on fin
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_fin_promo_product ON price_promo_opt_temp.fin (promo_id, product_id, customer_id);';

    -- Step 3: Create unlogged table fin_override
    RAISE NOTICE 'Step 3: Creating unlogged table fin_override';
    step_start_time := clock_timestamp();
    -- Create unlogged table fin_override
    query :=  FORMAT('
        CREATE UNLOGGED TABLE price_promo_opt_temp.fin_override AS
        SELECT promo_id, product_id, recommendation_date, 
				store_hierarchy, cm.customer_id,
				sum(baseline_sales_units) as baseline_sales_units, sum(baseline_revenue) as baseline_revenue, sum(baseline_margin) baseline_margin, 
				sum(contribution_revenue) as contribution_revenue, sum(contribution_margin) as contribution_margin,
				sum(sales_units) as sales_units, sum(revenue) as revenue, sum(margin) as margin
        FROM price_promo.ps_recommended_finalized_override prf 
        inner join global.customer_master cm on prf.customer_id = cm.c2_id
        where recommendation_date = %L
        group by 1,2,3,4,5
        ;

', var_date);
        RAISE NOTICE 'Executing : %', query;
        EXECUTE query;
    end_time := clock_timestamp();
    duration := end_time - step_start_time;
    RAISE NOTICE 'Step 3 COMPLETED: Create table fin_override took: %', duration;

    -- Create index on fin_override
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_fin_override_promo_product ON price_promo_opt_temp.fin_override (promo_id, product_id, customer_id);';

    -- Step 4: Create unlogged table fin_stack
    RAISE NOTICE 'Step 4: Creating unlogged table fin_stack';
    step_start_time := clock_timestamp();
    -- Create unlogged table fin_stack
    query :=  FORMAT('
        CREATE UNLOGGED TABLE price_promo_opt_temp.fin_stack AS
        SELECT unnest_promo_id AS promo_id, product_id, recommendation_date, 
				store_hierarchy, cm.customer_id,
				----------------
				max(currency_id) as currency_id,-- vat_percentage,
				----------------
				max(discount_level_value) as discount_level_value, max(offer_type_id) as offer_type_id, max(created_by) as created_by, 
				max(updated_by) as updated_by, max(created_at) as created_at, max(updated_at) as updated_at,
				sum(baseline_sales_units) as baseline_sales_units, sum(baseline_revenue) as baseline_revenue, sum(baseline_margin) baseline_margin, 
				sum(pos_baseline_sales_units) as pos_baseline_sales_units, sum(pos_baseline_revenue) as pos_baseline_revenue, sum(pos_baseline_margin) as pos_baseline_margin,
				sum(contribution_revenue) as contribution_revenue, sum(contribution_margin) as contribution_margin,
				sum(sales_units) as sales_units, sum(revenue) as revenue, sum(margin) as margin
        FROM price_promo.ps_recommended_finalized_stack prf
        CROSS JOIN LATERAL UNNEST(promo_ids) AS unnest_promo_id
        inner join global.customer_master cm on prf.customer_id = cm.c2_id
        WHERE recommendation_date = %L
		group by 1,2,3,4,5;

', var_date);
		RAISE NOTICE 'Executing : %', query;
        EXECUTE query;
    end_time := clock_timestamp();
    duration := end_time - step_start_time;
    RAISE NOTICE 'Step 4 COMPLETED: Create table fin_stack took: %', duration;

    -- Create index on fin_stack
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_fin_stack_promo_product ON price_promo_opt_temp.fin_stack (promo_id, product_id, customer_id);';

    -- Step 5: Create unlogged table fin_stack_override
    RAISE NOTICE 'Step 5: Creating unlogged table fin_stack_override';
    step_start_time := clock_timestamp();
    -- Create unlogged table fin_stack_override
    query :=  FORMAT('
        CREATE UNLOGGED TABLE price_promo_opt_temp.fin_stack_override AS
        SELECT unnest_promo_id AS promo_id,  product_id, recommendation_date,
				store_hierarchy, cm.customer_id,
				sum(baseline_sales_units) as baseline_sales_units, sum(baseline_revenue) as baseline_revenue, sum(baseline_margin) baseline_margin, 
				sum(pos_baseline_sales_units) as pos_baseline_sales_units, sum(pos_baseline_revenue) as pos_baseline_revenue, sum(pos_baseline_margin) as pos_baseline_margin,
				sum(contribution_revenue) as contribution_revenue, sum(contribution_margin) as contribution_margin,
				sum(sales_units) as sales_units, sum(revenue) as revenue, sum(margin) as margin
        FROM price_promo.ps_recommended_finalized_stack_override prf
        CROSS JOIN LATERAL UNNEST(promo_ids) AS unnest_promo_id
        inner join global.customer_master cm on prf.customer_id = cm.c2_id
        WHERE recommendation_date = %L
		group by 1,2,3,4,5;

', var_date);
		RAISE NOTICE 'Executing : %', query;
        EXECUTE query;
    end_time := clock_timestamp();
    duration := end_time - step_start_time;
    RAISE NOTICE 'Step 5 COMPLETED: Create table fin_stack_override took: %', duration;

    -- Create index on fin_stack_override
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_fin_stack_override_promo_product ON price_promo_opt_temp.fin_stack_override (promo_id, product_id, customer_id);';

    -- Step 6: Create temporary table for actuals data
    RAISE NOTICE 'Step 6: Creating temporary table ps_reco_actuals_temp';
    step_start_time := clock_timestamp();
    -- Create temporary table for actuals data
    query :=  FORMAT('
        CREATE UNLOGGED TABLE price_promo_opt_temp.ps_reco_actuals_temp AS
        SELECT
            ppp.event_id,
            ppp.promo_id,
            ppp.product_id, 
            ppp.store_hierarchy, 
			ppp.s0_id, ppp.s3_id,
            ppp.customer_id,
            ppp.recommendation_date, 
            prm.offer_distribution_channel, prm.is_default,

            AVG(COALESCE(aum, 0)) AS aum,
            AVG(COALESCE(aur, 0)) AS aur,

            SUM(COALESCE(gross_margin, 0)) AS margin,
            SUM(COALESCE(gross_revenue, 0)) AS revenue,
            SUM(COALESCE(gross_quantity, 0)) AS sales_units,
            
            SUM(COALESCE(contri_margin, 0)) AS contribution_margin,
            SUM(COALESCE(gross_revenue, 0)) AS contribution_revenue,

            AVG(COALESCE(gross_disc, 0)) AS discounted_price,
            AVG(COALESCE(gross_cost, 0)) AS original_cost,
            0 AS original_price,
			AVG(COALESCE(gross_dis_perc, 0)) AS effective_discount,
            SUM(COALESCE(gross_promo_discount_percent, 0)) AS promo_spend


        FROM price_promo_opt_temp.current_finalized_promo_products_temp ppp
		LEFT JOIN  price_promo.%I pt    
		on pt.product_id=ppp.product_id and pt.store_id=ppp.store_id and pt.c2_id = ppp.customer_id

        LEFT JOIN 
			  (
				SELECT a.promo_id, offer_distribution_channel,
                COALESCE(is_default, false) AS is_default
                FROM price_promo.promo_master a
                LEFT JOIN price_promo.tb_promo_override_forecast b
                ON a.promo_id = b.promo_id AND a.last_approved_scenario_id = b.scenario_id
			   ) AS prm USING (promo_id)

		--WHERE no_of_txn > 0
        GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10;', promo_txn_table);
		RAISE NOTICE 'Executing : %', query;
        EXECUTE query;
    end_time := clock_timestamp();
    duration := end_time - step_start_time;
    RAISE NOTICE 'Step 6 COMPLETED: Create table ps_reco_actuals_temp took: %', duration;

    -- Create index on ps_reco_actuals_temp1
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_ps_reco_actuals_temp_promo_product ON price_promo_opt_temp.ps_reco_actuals_temp (promo_id, product_id);';

    -- Step 7: Create date partitions and insert data
    RAISE NOTICE 'Step 7: Creating partitions and inserting final data';
    step_start_time := clock_timestamp();
    CALL price_promo_opt.pc_create_date_partitions('price_promo', 'ps_recommended_actuals', 'day', '14 day', 'backwards');
		RAISE NOTICE 'Executing : price_promo_opt.pc_create_date_partitions(price_promo, ps_recommended_actuals, day, 14 day, backwards)';

    DELETE FROM price_promo.ps_recommended_actuals
    WHERE recommendation_date = var_date;


    query := FORMAT(
    'INSERT INTO price_promo.ps_recommended_actuals (
        event_id, promo_id, product_id, recommendation_date, customer_id,
		s0_id, s3_id, store_hierarchy,
        discount_level_value, offer_type_id, created_by, updated_by, created_at, updated_at,
        effective_discount, original_price, original_cost, discounted_price, promo_spend, 
        sales_units, baseline_sales_units, incremental_sales_units,
        revenue, baseline_revenue, incremental_revenue,
        margin, baseline_margin, incremental_margin, aur, aum, 

			currency_id,

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
            txn.event_id, txn.promo_id, 
            txn.product_id, txn.recommendation_date, txn.customer_id,
			txn.s0_id, txn.s3_id, txn.store_hierarchy,
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

			COALESCE(f.currency_id, 1),

       		txn.contribution_revenue,
	        txn.contribution_margin,

		f.baseline_sales_units, f.baseline_revenue, f.baseline_margin,
		fo.baseline_sales_units, fo.baseline_revenue, fo.baseline_margin,
		fs.baseline_sales_units, fs.baseline_revenue, fs.baseline_margin,
		fs.pos_baseline_sales_units, fs.pos_baseline_revenue, fs.pos_baseline_margin,
		fso.baseline_sales_units, fso.baseline_revenue, fso.baseline_margin,
		fso.pos_baseline_sales_units, fso.pos_baseline_revenue, fso.pos_baseline_margin

        FROM
            price_promo_opt_temp.ps_reco_actuals_temp txn
        LEFT JOIN 
		-- ALL joins at sotr_hierarchy
			 price_promo_opt_temp.fin f USING (promo_id, product_id, store_hierarchy, customer_id) 
		LEFT JOIN
			 price_promo_opt_temp.fin_override fo USING (promo_id, product_id, store_hierarchy, customer_id)
		LEFT JOIN
			 price_promo_opt_temp.fin_stack fs USING (promo_id, product_id, store_hierarchy, customer_id)
		LEFT JOIN
			 price_promo_opt_temp.fin_stack_override fso USING (promo_id, product_id, store_hierarchy, customer_id)
        WHERE COALESCE(f.sales_units, 0) > 0
            OR COALESCE(txn.sales_units, 0) > 0
    );');
		RAISE NOTICE 'Executing : %', query;
        EXECUTE query;
    end_time := clock_timestamp();
    duration := end_time - step_start_time;
    RAISE NOTICE 'Step 7 COMPLETED: Insert final data took: %', duration;

    -- Calculate overall duration
    end_time := clock_timestamp();
    duration := end_time - start_time;
    RAISE NOTICE '=== pc_add_actuals_data COMPLETED in: % ===', duration;

END;
$procedure$
;
