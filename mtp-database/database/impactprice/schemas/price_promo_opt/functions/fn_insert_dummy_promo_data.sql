--liquibase formatted sql
--changeset harshith.mandli@impactanalytics.co:fn_insert_dummy_promo_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changes for fn_insert_dummy_promo_data

DROP FUNCTION IF EXISTS price_promo_opt.fn_insert_dummy_promo_data;

CREATE OR REPLACE FUNCTION price_promo_opt.fn_insert_dummy_promo_data(truncate_all_tables_flag boolean DEFAULT false, actual_forex_flag boolean DEFAULT true, txn_master_flag boolean DEFAULT true, txn_flag boolean DEFAULT true, budget_baseline_flag boolean DEFAULT true, budget_ty_flag boolean DEFAULT true, sim_week_flag boolean DEFAULT true, day_split_flag boolean DEFAULT true, store_split_flag boolean DEFAULT true)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN

	IF truncate_all_tables_flag THEN

		DELETE FROM global.actual_forex_rate WHERE 1 = 1;
		TRUNCATE TABLE price_promo_opt.promo_txn_master;
		TRUNCATE TABLE price_promo_opt.promo_txn;
		TRUNCATE TABLE price_promo_opt.tb_budget_master_baseline;
		TRUNCATE TABLE price_promo_opt.tb_budget_master_ty;
		TRUNCATE TABLE price_promo_opt.tb_simulation_week_opt;
		TRUNCATE TABLE price_promo_opt.tb_day_split_opt;
		TRUNCATE TABLE price_promo_opt.tb_store_split_opt;

	END IF;

    /* -------------------------------
		actual_forex_rate
    --------------------------------*/

	IF actual_forex_flag THEN

		INSERT INTO global.actual_forex_rate (
		    date,
		    source_currency_id,
		    target_currency_id,
		    planned_conversion_multiplier
		)
		SELECT
		    current_date - 1 AS date,
		    x.source_currency_id,
		    x.target_currency_id,
		    x.planned_conversion_multiplier
		FROM (
		    VALUES
		        (1, 1, 1.0000),
		        (1, 2, 1.5200),
		        (1, 3, 1.3600),
		        (1, 4, 0.9200),
		        (2, 1, 0.6579),
		        (2, 2, 1.0000),
		        (2, 3, 0.8947),
		        (2, 4, 0.6053),
		        (3, 1, 0.7353),
		        (3, 2, 1.1176),
		        (3, 3, 1.0000),
		        (3, 4, 0.6765),
		        (4, 1, 1.0870),
		        (4, 2, 1.6522),
		        (4, 3, 1.4783),
		        (4, 4, 1.0000)
			) x (source_currency_id, target_currency_id, planned_conversion_multiplier)
			ON CONFLICT (date, source_currency_id, target_currency_id) DO NOTHING;

	END IF; 

    /* -------------------------------
		promo_txn_master
    --------------------------------*/

	IF txn_master_flag THEN

		CALL price_promo_opt.pc_create_date_partitions('price_promo_opt', 'promo_txn_master', 'day', '1 day', 'backward');

		INSERT INTO price_promo_opt.promo_txn_master (
			product_id,
			transaction_id,
	        store_id,
	        date_id,
	        currency,
	        currency_id,
	        no_of_txn,
	        cost,
	        base_price,
			base_price_secondary,
			retail_price,
	        quantity,
	        revenue,
	        margin,
	        selling_price,
			dis_amount,
			dis_perc,
			final_discount_percent,
			final_amount,
	        promo_spend,
	        promo_discount,
			coupon_amount,
			coupon_discount,
	        aur,
	        aum,
			store_reco_level
	    )
	    SELECT DISTINCT 
			product_id, transaction_id, store_id, date AS date_id, currency, currency_id, no_of_txn,
			cost, base_price, base_price_secondary, retail_price, qty,
			selling_price*qty AS revenue, ((selling_price * qty) - (cost*qty)) AS margin,
			selling_price, (selling_price - base_price) AS dis_amount, 
			(abs(base_price - selling_price) / NULLIF(base_price, 0)) * 100 AS dis_perc,
			(abs(base_price - selling_price) / NULLIF(base_price, 0)) * 100 AS final_discount_percent,
			(selling_price - base_price) AS final_amount,
			promo_spend,
			promo_discount, 0 AS coupon_amount, 0 AS coupon_discount,
			(selling_price*qty)/qty AS aur, ((selling_price * qty) - (cost*qty))/qty AS aum,
			store_reco_level
	
		FROM 
		(
		WITH base AS (
		    SELECT
		        p.product_id,
				CONCAT(product_id, '-', store_id, '-', to_char(date, 'YYYYMMDD')) AS transaction_id,
		        f.date,
		        s.store_id,
		        c.currency,
		        p.currency_id,
		        1 + floor(random()*10) AS no_of_txn,
		        p.cost,
		        p.promo_base_price AS base_price,p.promo_base_price AS base_price_secondary, p.promo_base_price AS retail_price,
		        1 + floor(random()*20) AS qty,
		        p.msrp * (1 - random()*0.5) AS selling_price,
		        100 + random()*20 AS promo_spend,
		        10 + random()*5 AS promo_discount,
		        s.store_reco_level,
		        row_number() OVER (PARTITION BY f.date ORDER BY random()) AS rn, -- product_id/random()
		        count(*) OVER (PARTITION BY f.date) AS total_cnt
		    FROM (SELECT product_id, currency_id, promo_base_price, cost, msrp FROM price_promo.product_master WHERE is_active=1) p
		    JOIN (SELECT currency_name AS currency, currency_id FROM global.tb_currency_master) c USING (currency_id)
		    CROSS JOIN (SELECT store_id, store_reco_level FROM pricesmart.tb_store_master WHERE is_active =1 ) s
		    CROSS JOIN (SELECT date FROM global.tb_fiscal_date_mapping WHERE date BETWEEN current_date - 1 AND current_date - 1)f
		)
		SELECT *
		FROM base
		WHERE rn <= total_cnt * (0.2 + random()*0.1)) a
		ON CONFLICT (transaction_id, product_id, store_id, date_id) DO NOTHING;

	END IF;

    /* -------------------------------
		promo_txn
    --------------------------------*/

	IF txn_flag THEN

		CALL price_promo_opt.pc_create_date_partitions('price_promo_opt', 'promo_txn', 'day', '1 day', 'backward');

	    INSERT INTO price_promo_opt.promo_txn (
	        product_id,
	        date_id,
	        store_id,
	        currency,
	        currency_id,
	        no_of_txn,
	        cost,
	        promo_base_price,
	        quantity,
	        revenue,
	        margin,
	        selling_price,
	        promo_spend,
	        promo_discount,
	        aur,
	        aum,
	        clearance_indicator,
			store_reco_level,
	        inventory
	    )
	    SELECT DISTINCT 
			product_id, date_id, store_id, currency, currency_id, count(DISTINCT transaction_id) AS no_of_txn,
			avg(cost) AS cost, avg(base_price) AS promo_base_price, sum(quantity) AS quantity,
			sum(revenue) AS revenue,  sum(margin) AS margin, -- agg
			sum(selling_price) AS selling_price,   -- aggregate
			sum(promo_spend) AS promo_spend,
			avg(promo_discount) AS promo_discount,
			avg(aur) AS aur, avg(aum) AS aum,
			0 AS clearance_indicator,
			store_reco_level,
			floor(random()*20) inventory
	 	FROM price_promo_opt.promo_txn_master
		GROUP BY product_id, date_id, store_id, currency, currency_id, store_reco_level
		ON CONFLICT (product_id, date_id, store_id) DO NOTHING;

	END IF;

	/* -------------------------------
		tb_budget_master_baseline
    --------------------------------*/

	IF budget_baseline_flag THEN

		CALL price_promo_opt.pc_create_date_partitions('price_promo_opt', 'tb_budget_master_baseline', 'day', '2 day', 'backward');

	    INSERT INTO price_promo_opt.tb_budget_master_baseline (
	        product_id,
			dates,
			units,
			margin,
			revenue,
			store_id,
			promo_spend,
			currency_id,
			store_reco_level
	    )
	    SELECT DISTINCT
	        p.product_id, -- 0% baseline * split_ratio
	        f.date,
	        1 + floor(random()*30), -- units 
	        300 + random()*50, -- margin
	        1200 + random()*200, -- revenue
	        s.store_id,
	        100 + random()*20, -- promo_spend
	        p.currency_id,
			s.store_reco_level
	    FROM (SELECT DISTINCT product_id, currency_id FROM price_promo.product_master WHERE is_active = 1) p
		CROSS JOIN (SELECT DISTINCT store_reco_level, store_id FROM pricesmart.tb_store_master WHERE is_active = 1) s
		CROSS JOIN (SELECT DISTINCT date FROM global.tb_fiscal_date_mapping WHERE date BETWEEN current_date - 2 AND current_date - 1) f
	    ON CONFLICT (product_id, store_id, dates) DO NOTHING;

	END IF;

	/* -------------------------------
		tb_budget_master_ty
    --------------------------------*/

	IF budget_ty_flag THEN

		CALL price_promo_opt.pc_create_date_partitions('price_promo_opt', 'tb_budget_master_ty', 'day', '365 day', 'backwards');

	    INSERT INTO price_promo_opt.tb_budget_master_ty (
	        product_id,
			dates,
			units,
			margin,
			revenue,
			store_id,
			promo_spend
	    )
	    SELECT DISTINCT
	        p.product_id,
	        f.date,
	        100 + floor(random()*30), -- units -- baseline * 1.1, use baseline table
	        300 + random()*50, -- margin
	        1200 + random()*200, -- revenue
	        s.store_id,
	        100 + random()*20 -- promo_spend
	    FROM (SELECT DISTINCT product_id FROM price_promo.product_master WHERE is_active = 1) p
		CROSS JOIN (SELECT DISTINCT store_reco_level, store_id FROM pricesmart.tb_store_master WHERE is_active = 1) s
		CROSS JOIN (SELECT DISTINCT date FROM global.tb_fiscal_date_mapping WHERE date BETWEEN current_date - 2 AND current_date + 180) f
	    ON CONFLICT (product_id, store_id, dates) DO NOTHING;

	END IF;

	/* -------------------------------
		tb_simulation_week_opt
	--------------------------------*/

	IF sim_week_flag THEN

		CALL price_promo_opt.pc_create_date_partitions('price_promo_opt', 'tb_simulation_week_opt', 'day', '365 day', 'backwards');

		INSERT INTO price_promo_opt.tb_simulation_week_opt (
		    product_id,
		    simulation_week_start_date,
		    base_percentage,
		    sales_units,
		    baseline_sales_units,
		    elasticity,
		    s0_id,
		    s1_id
		)
		WITH baseline AS (
		    SELECT
		        p.product_id,
		        f.simulation_week_start_date,
		        s.s0_id,
		        s.s1_id,
		        15 + floor(random()*10) AS baseline_sales_units
		    FROM (SELECT DISTINCT product_id FROM price_promo.product_master WHERE is_active = 1) p
		    CROSS JOIN (SELECT DISTINCT s0_id, s1_id FROM pricesmart.tb_store_master WHERE is_active = 1) s
		    CROSS JOIN (
		        SELECT DISTINCT simulation_week_start_date
		        FROM global.tb_fiscal_date_mapping
		        WHERE simulation_week_start_date BETWEEN current_date - 20 AND current_date + 183
		    ) f
		)
		
		SELECT
		    b.product_id,
		    b.simulation_week_start_date,
		    bp.base_percentage,
		
		    /* sales_units */
		    CASE
		        WHEN bp.base_percentage = 0
		            THEN b.baseline_sales_units
		        ELSE
		            b.baseline_sales_units
		            + CEIL(b.baseline_sales_units * bp.base_percentage / 100.0)
		    END AS sales_units,
		
		    b.baseline_sales_units,
		    1.5 + random()*0.2 AS elasticity,
		    b.s0_id,
		    b.s1_id
		FROM baseline b
		CROSS JOIN generate_series(0, 95, 5) AS bp(base_percentage)
	    ON CONFLICT (product_id, s0_id, s1_id, simulation_week_start_date, base_percentage) DO NOTHING;

	END IF;
	
	/* -------------------------------
		tb_day_split_opt
	--------------------------------*/

	IF day_split_flag THEN

		CALL price_promo_opt.pc_create_date_partitions('price_promo_opt', 'tb_day_split_opt', 'day', '365 day', 'backwards');

	    INSERT INTO price_promo_opt.tb_day_split_opt (
	        l3_cid,
	        l0_cid,
	        s0_id,
	        s1_id,
	        date,
	        simulation_week_start_date,
	        day_split_ratio
	    )
	    WITH cte_1 AS (
		    SELECT DISTINCT
		        p.l3_cid,
		        p.l0_cid,
		        s.s0_id,
		        s.s1_id,
		        f.date,
		        f.simulation_week_start_date
		    FROM (SELECT DISTINCT l3_cid, l0_cid FROM price_promo.product_master WHERE is_active = 1) p
		    CROSS JOIN (SELECT DISTINCT s0_id, s1_id FROM pricesmart.tb_store_master WHERE is_active = 1) s
		    CROSS JOIN (SELECT DISTINCT date, simulation_week_start_date FROM global.tb_fiscal_date_mapping WHERE simulation_week_start_date BETWEEN current_date - 30 AND current_date + 183) f
		),
		cte_2 AS (
		    SELECT
		        *,
		        random() AS rnd
		    FROM cte_1
		),
		cte_3 AS (
		    SELECT
		        *,
		        SUM(rnd) OVER (PARTITION BY simulation_week_start_date, l3_cid, l0_cid, s0_id, s1_id) AS rnd_sum
		    FROM cte_2
		)
		SELECT
		    l3_cid,
		    l0_cid,
		    s0_id,
		    s1_id,
		    date,
		    simulation_week_start_date,
		    rnd / rnd_sum
		FROM cte_3
	    ON CONFLICT (l0_cid, l3_cid, s0_id, s1_id, date) DO NOTHING;

	END IF;
	
	/* -------------------------------
		tb_store_split_opt
	--------------------------------*/

	IF store_split_flag THEN

		CALL price_promo_opt.pc_create_date_partitions('price_promo_opt', 'tb_store_split_opt', 'day', '365 day', 'backwards');

	    INSERT INTO price_promo_opt.tb_store_split_opt (
			l3_cid,
			l0_cid,
			simulation_week_start_date,
			store_reco_level,
			store_split_ratio,
			s0_id,
			s1_id,
	        store_id
	    )
	    WITH cte_1 AS (
		    SELECT DISTINCT
		        p.l3_cid,
		        p.l0_cid,
		        f.simulation_week_start_date,
		        s.store_reco_level,
		        s.s0_id,
		        s.s1_id,
		        s.store_id
			FROM (SELECT DISTINCT l3_cid, l0_cid FROM price_promo.product_master WHERE is_active = 1) p
		    CROSS JOIN (SELECT DISTINCT s0_id, s1_id, store_reco_level, store_id FROM pricesmart.tb_store_master WHERE is_active = 1) s
		    CROSS JOIN (SELECT DISTINCT simulation_week_start_date FROM global.tb_fiscal_date_mapping WHERE simulation_week_start_date BETWEEN current_date - 30 AND current_date + 180) f
		),
		cte_2 AS (
		    SELECT
		        *,
		        random() AS rnd
		    FROM cte_1
		),
		cte_3 AS (
		    SELECT
		        *,
		        SUM(rnd) OVER (PARTITION BY simulation_week_start_date, l3_cid, l0_cid, s0_id, s1_id) AS rnd_sum
		    FROM cte_2
		)
		SELECT
		    l3_cid,
		    l0_cid,
		    simulation_week_start_date,
		    store_reco_level,
		    rnd / rnd_sum,
		    s0_id,
		    s1_id,
		    store_id
		FROM cte_3
	    ON CONFLICT (l0_cid, l3_cid, store_id, simulation_week_start_date) DO NOTHING;

	END IF;

END;
$function$
;
