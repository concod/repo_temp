--liquibase formatted sql
--changeset surya.avinash@impactanalytics.co:fn_workbench_s4_get_current_view_ol_10 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: fn_workbench_s4_get_current_view_ol_10

DROP FUNCTION IF EXISTS price_markdown.fn_workbench_s4_get_current_view_ol;

CREATE OR REPLACE FUNCTION price_markdown.fn_workbench_s4_get_current_view_ol(_sid integer, _product_level_id integer, _store_level_id integer)
 RETURNS TABLE("BrandSKU" text, "Product Name" text[], product_level_value text, store_level_value text, pcd_start_date date, pcd_end_date date, approval_status character varying, "IA Reco Discount" numeric, "Fin Discount" numeric, "IA Reco Price Point" numeric, "Fin Price Point" numeric, "IA Reco Units" numeric, "Fin Units" numeric, "IA Reco Revenue" numeric, "Fin Revenue" numeric, "IA Reco Margin" numeric, "Fin Margin" numeric, "IA Reco Markdown" numeric, "Fin Markdown" numeric, "IA Reco Inventory" numeric, "Fin Inventory" numeric, "IA Reco Price Point Secondary" numeric, "Fin Price Point Secondary" numeric, "IA Reco Revenue Secondary" numeric, "Fin Revenue Secondary" numeric, "IA Reco Margin Secondary" numeric, "Fin Margin Secondary" numeric, "IA Reco Markdown Secondary" numeric, "Fin Markdown Secondary" numeric, primary_currency_symbol text, secondary_currency_symbol text, product_recommendation_level integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    future_start_date DATE;
    query TEXT;
    vl_total_count INT := 9999999;
    start_time TIMESTAMP;
    end_time TIMESTAMP;
	primary_currency text := '';
	secondary_currency text := '';
	currency_multiplier numeric := 1.0;

BEGIN
	SELECT COALESCE(MIN(tsp.pcd_start_date), (
        SELECT MIN(t1.pcd_start_date)
        FROM price_markdown.tb_strategy_pcd t1
        WHERE strategy_id = _sid
    )) INTO future_start_date
    FROM price_markdown.tb_strategy_pcd tsp
    WHERE tsp.strategy_id = _sid
      AND tsp.pcd_start_date >= DATE(timezone('US/Eastern', now()));

	SELECT 
		tcm.currency_symbol INTO primary_currency FROM price_markdown.tb_strategy_master tsm 
	INNER JOIN 
		global.tb_currency_master tcm on tsm.currency_id = tcm.currency_id 
	WHERE
		tsm.strategy_id = _sid;

	IF primary_currency = '£' THEN 
	    secondary_currency := '€';
		query := format('SELECT 
			acr.planned_conversion_multiplier
		FROM 
			global.actual_forex_rate acr
		WHERE 
			acr.source_currency_id = (SELECT currency_id FROM global.tb_currency_master WHERE currency_symbol=''%1$s'') 
		AND 
			acr.target_currency_id = (SELECT currency_id FROM global.tb_currency_master WHERE currency_symbol=''%2$s'')
		AND
			acr.date = current_date;', primary_currency, secondary_currency);

		RAISE NOTICE 'currency multiplier query --%', query;

	    start_time := clock_timestamp();

	    EXECUTE query INTO currency_multiplier;
		currency_multiplier := COALESCE(currency_multiplier, 1);

	    end_time := clock_timestamp();
	    RAISE NOTICE 'Time taken currency multiplier query statement: %', end_time - start_time;		
	END IF;


-- Create product level table based on product level ID
    IF _product_level_id IN (-100) THEN
        query := format('
            DROP TABLE IF EXISTS price_markdown_opt_temp.tb_pcte_%1$s;
            CREATE UNLOGGED TABLE price_markdown_opt_temp.tb_pcte_%1$s AS
            SELECT
                a.product_id,
                tpg.pg_name AS product_level,
                a.pg_id AS product_level_id,
				array_agg(DISTINCT pm.product_name) as product_name
            FROM
                (
                    SELECT
                        pm.product_id,
                        MIN(pg_id) AS pg_id
                    FROM
                        global.tb_pg_product tpp
                    INNER JOIN
                        price_markdown.product_master pm
                        ON pm.product_id = tpp.product_id
                    INNER JOIN
                        (
                            SELECT
                                product_group_id
                            FROM
                                price_markdown.tb_strategy_product_groups
                            WHERE
                                strategy_id = %1$s
                        ) c
                        ON tpp.pg_id = c.product_group_id
                    GROUP BY
                        pm.product_id
                ) a
            INNER JOIN
                global.tb_product_group tpg
                ON a.pg_id = tpg.pg_id;', _sid);
    ELSE
        query := format('
            DROP TABLE IF EXISTS price_markdown_opt_temp.tb_pcte_%1$s;
            CREATE UNLOGGED TABLE price_markdown_opt_temp.tb_pcte_%1$s AS
            SELECT
                pm.product_id,
                CASE
                    WHEN %2$s = 0 THEN pm.l0_cuq
                    WHEN %2$s = 1 THEN pm.l1_cuq
                    WHEN %2$s = 2 THEN pm.l2_cuq
                    WHEN %2$s = 3 THEN pm.l3_cuq
                    WHEN %2$s = 4 THEN pm.l4_cuq
                    WHEN %2$s = 5 THEN pm.l5_cuq
                    WHEN %2$s = 6 THEN pm.l6_cuq
					WHEN %2$s = 7 THEN pm.brandsku
                    WHEN %2$s = -200 THEN ''Overall''
                    ELSE ''Unknown Level''
                END AS product_level,
                CASE
                    WHEN %2$s = 0 THEN pm.l0_cid
                    WHEN %2$s = 1 THEN pm.l1_cid
                    WHEN %2$s = 2 THEN pm.l2_cid
                    WHEN %2$s = 3 THEN pm.l3_cid
                    WHEN %2$s = 4 THEN pm.l4_cid
                    WHEN %2$s = 5 THEN pm.l5_cid
                    WHEN %2$s = 6 THEN pm.l6_cid
					WHEN %2$s = 7 THEN pm.product_id
                    WHEN %2$s = -200 THEN -200
                    ELSE NULL
                END AS product_level_id,
				array_agg(DISTINCT pm.product_name) as product_name
            FROM
                price_markdown.tb_strategy_sku_store_mapping_%1$s ss
            INNER JOIN
                price_markdown.product_master pm ON ss.product_id = pm.product_id
            GROUP BY 1, 2, 3;', _sid, _product_level_id);
    END IF;

    RAISE NOTICE 'Query-0 -- %', query;
    start_time := clock_timestamp();
    EXECUTE query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken SQL 0 statement: %', end_time - start_time;

    -- Create store level table based on store level ID
    IF _store_level_id IN (-100) THEN
        query := format('
            DROP TABLE IF EXISTS price_markdown_opt_temp.tb_scte_%1$s;
            CREATE UNLOGGED TABLE price_markdown_opt_temp.tb_scte_%1$s AS
            SELECT
                a.store_id,
                tsg.sg_name AS store_level,
                a.sg_id AS store_level_id
            FROM
                (
                    SELECT
                        store_id,
                        MIN(sg_id) AS sg_id
                    FROM
                        global.tb_sg_store tss
                    INNER JOIN
                        (
                            SELECT
                                store_group_id
                            FROM
                                price_markdown.tb_strategy_store_groups
                            WHERE
                                strategy_id = %1$s
                        ) c
                        ON tss.sg_id = c.store_group_id
                    GROUP BY store_id
                ) a
            INNER JOIN global.tb_store_group tsg
            ON a.sg_id = tsg.sg_id;', _sid, _store_level_id);

    ELSE
    	query := format('
            DROP TABLE IF EXISTS price_markdown_opt_temp.tb_scte_%1$s;
            CREATE UNLOGGED TABLE price_markdown_opt_temp.tb_scte_%1$s AS
            SELECT DISTINCT
                sm.store_id,
                CASE
                    WHEN %2$s = 0 THEN sm.s0_name
                    WHEN %2$s = 1 THEN sm.s1_name
                    WHEN %2$s = 2 THEN sm.s2_name
                    WHEN %2$s = 3 THEN sm.s3_name
                    WHEN %2$s = 4 THEN sm.s4_name
                    WHEN %2$s = 5 THEN sm.s5_name
                    WHEN %2$s = 6 THEN sm.store_name
                    WHEN %2$s = -200 THEN ''Overall''
                    ELSE ''Unknown Level''
                END AS store_level,
                CASE
                    WHEN %2$s = 0 THEN sm.s0_id
                    WHEN %2$s = 1 THEN sm.s1_id
                    WHEN %2$s = 2 THEN sm.s2_id
                    WHEN %2$s = 3 THEN sm.s3_id
                    WHEN %2$s = 4 THEN sm.s4_id
                    WHEN %2$s = 5 THEN sm.s5_id
                    WHEN %2$s = 6 THEN sm.store_id
                    WHEN %2$s = -200 THEN -200
                    ELSE NULL
                END AS store_level_id
            FROM
                price_markdown.tb_strategy_sku_store_mapping_%1$s ss
            INNER JOIN
                price_markdown.tb_store_master sm ON ss.store_id = sm.store_id;', _sid, _store_level_id);

    END IF;

    RAISE NOTICE 'Query-0.5 -- %', query;
    start_time := clock_timestamp();
    EXECUTE query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken SQL 0.5 statement: %', end_time - start_time;

    -- Define the CTEs for products and stores
    query := format('
    -- Create the table based on the CTEs and conditions
    DROP TABLE IF EXISTS price_markdown_opt_temp.tb_s4dov_ss_%1$s;
    CREATE UNLOGGED TABLE price_markdown_opt_temp.tb_s4dov_ss_%1$s AS
    SELECT
        ss.product_id,
        ss.store_id,
        ss.product_level_id,
        ss.store_level_id,
        pcte.product_level AS new_plv,
		MIN(pcte.product_name) as product_name,
        scte.store_level AS new_slv,
        pcte.product_level_id AS new_pli,
        scte.store_level_id AS new_sli
    FROM
        price_markdown.tb_strategy_sku_store_mapping_%1$s ss
    INNER JOIN
		price_markdown_opt_temp.tb_pcte_%1$s pcte ON ss.product_id = pcte.product_id
    INNER JOIN
		price_markdown_opt_temp.tb_scte_%1$s scte ON ss.store_id = scte.store_id
    INNER JOIN global.tb_latest_inventory inv
    ON ss.product_id = inv.product_id
	AND ss.store_id = inv.store_id
    GROUP BY
        ss.product_id,
        ss.store_id,
        ss.product_level_id,
        ss.store_level_id,
        pcte.product_level,
        scte.store_level,
        pcte.product_level_id,
        scte.store_level_id;', _sid, _product_level_id, _store_level_id);

    RAISE NOTICE 'Query-1 -- %', query;
    start_time := clock_timestamp();
    EXECUTE query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken SQL 1 statement: %', end_time - start_time;

    -- Step 2: Create tb_s4dov_sslevel table
    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_s4dov_sslevel_%1$s;', _sid);
    query := format('
        CREATE UNLOGGED TABLE price_markdown_opt_temp.tb_s4dov_sslevel_%1$s AS
        SELECT
            product_level_id,
            store_level_id,
            new_plv,
			MIN(product_name) as product_name,
            new_slv,
            new_pli,
            new_sli
        FROM price_markdown_opt_temp.tb_s4dov_ss_%1$s
        GROUP BY 1, 2, 3, 5, 6, 7;', _sid);

    RAISE NOTICE 'Query-2 --%', query;
    start_time := clock_timestamp();
    EXECUTE query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken SQL 2 statement: %', end_time - start_time;

    -- Step 3: Create tb_s4dov_iadisc table
    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_s4dov_iadisc_%1$s;', _sid);
    query := format('
        CREATE UNLOGGED TABLE price_markdown_opt_temp.tb_s4dov_iadisc_%1$s AS
        SELECT
            new_plv,
            new_slv,
            new_pli,
            new_sli,
            b.pcd_id,
            AVG(b.markdown_percentage) AS markdown_percentage
        FROM
			price_markdown_opt_temp.tb_s4dov_sslevel_%1$s a
        LEFT JOIN
			price_markdown.tb_strategy_discount_ia_%1$s b
            ON a.product_level_id = b.product_level_id
            AND a.store_level_id = b.store_level_id
		LEFT JOIN
			price_markdown.tb_strategy_pcd c
			ON b.pcd_id = c.pcd_id
		where c.pcd_start_date >=	''%2$s''
        GROUP BY 1, 2, 3, 4, 5;', _sid,future_start_date);

    RAISE NOTICE 'Query-3 --%', query;
    start_time := clock_timestamp();
    EXECUTE query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken SQL 3 statement: %', end_time - start_time;

    -- Step 4: Create tb_s4dov_iametrics table
    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_s4dov_iametrics_%1$s;', _sid);
    query := format('
        CREATE UNLOGGED TABLE price_markdown_opt_temp.tb_s4dov_iametrics_%1$s AS
        SELECT
            ia.strategy_id,
			ia.pcd_id,
            a.new_pli,
            a.new_sli,
            tsp.pcd_start_date,
            tsp.pcd_end_date,
            ROUND(AVG(ia.recommended_offer_percentage)::DECIMAL, 2) AS ia_discount,
            CASE
                WHEN SUM(ia.sales_units) > 0 THEN (SUM(ia.effective_price_point * ia.sales_units) / SUM(ia.sales_units))
                ELSE AVG(ia.effective_price_point)
            END AS effective_price_point,
            ROUND(SUM(ia.sales_units)::DECIMAL, 2) AS sales_units,
            ROUND(SUM(ia.margin)::DECIMAL, 2) AS margin,
            ROUND(SUM(ia.revenue)::DECIMAL, 2) AS revenue,
            ROUND(SUM(ia.spend)::DECIMAL, 2) AS spend,
            ROUND(SUM(CASE WHEN ia.recommendation_date = tsp.pcd_start_date THEN ia.rem_inv + ia.sales_units ELSE 0 END)::DECIMAL, 2) AS rem_inv
        FROM
			price_markdown.tb_ssd_ia_%1$s ia
        INNER JOIN
			price_markdown.tb_strategy_pcd tsp ON ia.pcd_id = tsp.pcd_id
        INNER JOIN
			price_markdown_opt_temp.tb_s4dov_ss_%1$s a
            ON a.product_id = ia.product_id
            AND a.store_id = ia.store_id
        WHERE ia.recommendation_date >= ''%2$s''
        GROUP BY 1, 2, 3, 4, 5, 6;', _sid, future_start_date);

    RAISE NOTICE 'Query-4 --%', query;
    start_time := clock_timestamp();
    EXECUTE query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken SQL 4 statement: %', end_time - start_time;

    -- Step 5: Create tb_s4dov_ia_all table
    execute format('drop table if exists price_markdown_opt_temp.tb_s4dov_ia_all_%1$s;',_sid);
               query :=  format('create unlogged table price_markdown_opt_temp.tb_s4dov_ia_all_%1$s as
                                   (
                                   select
                                   a.new_pli,
                                   a.new_sli,
                                   a.pcd_id,
                                   coalesce (b.ia_discount, a.markdown_percentage) as ia_discount,
                                   effective_price_point,
                                   coalesce(sales_units,0) sales_units,
                                   coalesce(margin,0) margin,
                                   coalesce(revenue,0) revenue,
                                   coalesce(spend,0) spend,
                                   coalesce(rem_inv,0) rem_inv
                                   from
										price_markdown_opt_temp.tb_s4dov_iadisc_%1$s a
                                   left join price_markdown_opt_temp.tb_s4dov_iametrics_%1$s b
                                   on a.new_pli = b.new_pli
                                   and a.new_sli = b.new_sli
                                   and a.pcd_id = b.pcd_id
                                   );',_sid);

     raise notice 'query- 5 --%' , query;
     start_time := clock_timestamp();
     execute query;
     end_time := clock_timestamp();
     RAISE NOTICE 'Time taken SQL 5 statement: %', end_time - start_time;

     -- Step 6: Create tb_s4dov_findisc table
     EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_s4dov_findisc_%1$s;', _sid);
     query := format('
        CREATE UNLOGGED TABLE price_markdown_opt_temp.tb_s4dov_findisc_%1$s AS
        SELECT
            new_plv,
			MIN(product_name) as product_name,
            new_slv,
            new_pli,
            new_sli,
            b.pcd_id,
			c.pcd_start_date,
			c.pcd_end_date,
            AVG(b.markdown_percentage) AS markdown_percentage,
			min(b.approval_status) as approval_status
        FROM
			price_markdown_opt_temp.tb_s4dov_sslevel_%1$s a
        LEFT JOIN
			price_markdown.tb_strategy_discount_%1$s b
            ON a.product_level_id = b.product_level_id
            AND a.store_level_id = b.store_level_id
		LEFT JOIN
			price_markdown.tb_strategy_pcd c
			ON b.pcd_id = c.pcd_id
		where c.pcd_start_date >= ''%2$s''
        GROUP BY 1, 3, 4, 5,6,7,8;', _sid, future_start_date);

    RAISE NOTICE 'Query-6 --%', query;
    start_time := clock_timestamp();
    EXECUTE query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken SQL 6 statement: %', end_time - start_time;

    -- Step 7: Create tb_s4dov_finmetrics table
    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_s4dov_finmetrics_%1$s;', _sid);
    query := format('
        CREATE UNLOGGED TABLE price_markdown_opt_temp.tb_s4dov_finmetrics_%1$s AS
        SELECT
            fin.strategy_id,
			fin.pcd_id,
            a.new_pli,
            a.new_sli,
            tsp.pcd_start_date,
            tsp.pcd_end_date,
            ROUND(AVG(fin.recommended_offer_percentage)::DECIMAL, 2) AS fin_discount,
            CASE
                WHEN SUM(fin.sales_units) > 0 THEN (SUM(fin.effective_price_point * fin.sales_units) / SUM(fin.sales_units))
                ELSE AVG(fin.effective_price_point)
            END AS effective_price_point,
            ROUND(SUM(fin.sales_units)::DECIMAL, 2) AS sales_units,
            ROUND(SUM(fin.margin)::DECIMAL, 2) AS margin,
            ROUND(SUM(fin.revenue)::DECIMAL, 2) AS revenue,
            ROUND(SUM(fin.spend)::DECIMAL, 2) AS spend,
            ROUND(SUM(CASE WHEN fin.recommendation_date = tsp.pcd_start_date THEN fin.rem_inv + fin.sales_units ELSE 0 END)::DECIMAL, 2) AS rem_inv
        FROM
			price_markdown.tb_ssd_fin_%1$s fin
        INNER JOIN
			price_markdown.tb_strategy_pcd tsp ON fin.pcd_id = tsp.pcd_id
        INNER JOIN
			price_markdown_opt_temp.tb_s4dov_ss_%1$s a
            ON a.product_id = fin.product_id
            AND a.store_id = fin.store_id
        WHERE fin.recommendation_date >= ''%2$s''
        GROUP BY 1, 2, 3, 4, 5, 6;', _sid, future_start_date);

    RAISE NOTICE 'Query-7 --%', query;
    start_time := clock_timestamp();
    EXECUTE query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken SQL 7 statement: %', end_time - start_time;

    -- Step 8: Create tb_s4dov_fin_all table
    execute format('drop table if exists price_markdown_opt_temp.tb_s4dov_fin_all_%1$s;',_sid);
    query := format('create unlogged table price_markdown_opt_temp.tb_s4dov_fin_all_%1$s as
                       (
                       select
                       a.new_pli,
                       a.new_sli,
					   a.new_plv,
					   a.product_name,
            		   a.new_slv,
                       a.pcd_id,
					   a.pcd_start_date,
					   a.pcd_end_date,
					   a.approval_status,
                       coalesce (b.fin_discount, a.markdown_percentage) as fin_discount,
                       effective_price_point,
                       coalesce(sales_units,0) sales_units,
                       coalesce(margin,0) margin,
                       coalesce(revenue,0) revenue,
                       coalesce(spend,0) spend,
                       coalesce(rem_inv,0) rem_inv
                       FROM
							price_markdown_opt_temp.tb_s4dov_findisc_%1$s a
                       LEFT JOIN
							price_markdown_opt_temp.tb_s4dov_finmetrics_%1$s b
                       on a.new_pli = b.new_pli
                       and a.new_sli = b.new_sli
                       and a.pcd_id = b.pcd_id
                       );',_sid);

   raise notice 'query- 8 --%' , query;
   start_time := clock_timestamp();
   execute query;
   end_time := clock_timestamp();
   RAISE NOTICE 'Time taken SQL 8 statement: %', end_time - start_time;



  ---- Step 9: Final select

   query := format('SELECT
					%2$s,
					%3$s,
			        fin.new_plv::text AS product_level_value,
			        ''ECOM'' AS store_level_value,
			        fin.pcd_start_date,
			        fin.pcd_end_date,
					fin.approval_status::character varying as approval_status,
			        ROUND(ia.ia_discount::numeric, 0) AS "IA Reco Discount",
			        ROUND(fin.fin_discount::numeric, 0) AS "Fin Discount",
			        ROUND(ia.effective_price_point::numeric, 2) AS "IA Reco Price Point",
			        ROUND(fin.effective_price_point::numeric, 2) AS "Fin Price Point",
			        ROUND(ia.sales_units::numeric, 2) AS "IA Reco Units",
			        ROUND(fin.sales_units::numeric, 2) AS "Fin Units",
			        ROUND(ia.revenue::numeric, 2) AS "IA Reco Revenue",
			        ROUND(fin.revenue::numeric, 2) AS "Fin Revenue",
			        ROUND(ia.margin::numeric, 2) AS "IA Reco Margin",
			        ROUND(fin.margin::numeric, 2) AS "Fin Margin",
			        ROUND(ia.spend::numeric, 2) AS "IA Reco Markdown",
			        ROUND(fin.spend::numeric, 2) AS "Fin Markdown",
			        ROUND(ia.rem_inv::numeric, 2) AS "IA Reco Inventory",
			        ROUND(fin.rem_inv::numeric, 2) AS "Fin Inventory",
					ROUND(ia.effective_price_point::numeric, 2) * %6$s AS "IA Reco Price Point Secondary",
		            ROUND(fin.effective_price_point::numeric, 2) * %6$s AS "Fin Price Point Secondary",
					ROUND(ia.revenue::numeric, 2) * %6$s  AS "IA Reco Revenue Secondary",
		            ROUND(fin.revenue::numeric, 2) * %6$s AS "Fin Revenue Secondary",
		            ROUND(ia.margin::numeric, 2 ) * %6$s AS "IA Reco Margin Secondary",
		            ROUND(fin.margin::numeric, 2) * %6$s AS "Fin Margin Secondary",
		            ROUND(ia.spend::numeric, 2) * %6$s AS "IA Reco Markdown Secondary",
		            ROUND(fin.spend::numeric, 2) * %6$s AS "Fin Markdown Secondary",
					''%4$s'' as primary_currency_symbol,
					''%5$s'' as secondary_currency_symbol,
					''%7$s''::int as product_recommendation_level
			    FROM
			        price_markdown_opt_temp.tb_s4dov_fin_all_%1$s fin
			    LEFT JOIN
			        price_markdown_opt_temp.tb_s4dov_ia_all_%1$s ia
			    ON
			        fin.new_pli = ia.new_pli
			        AND fin.new_sli = ia.new_sli
			        AND fin.pcd_id = ia.pcd_id;', 
				_sid,
				CASE WHEN _product_level_id = 7 THEN 'fin.new_plv as "BrandSKU"' ELSE 'NULL::text as "BrandSKU"' END,
				CASE WHEN _product_level_id = 7 THEN 'fin.product_name::text[] as "Product Name"' ELSE 'NULL::text[] as "Product Name"' END,
				primary_currency, secondary_currency, currency_multiplier, _product_level_id);

	RAISE NOTICE 'Executing Final Query: %', query;
	RETURN QUERY EXECUTE query;

	-- Drop temporary tables
	EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt.tb_pcte_%1$s', _sid);
	EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt.tb_scte_%1$s_%1$s', _sid);
    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt.tb_s4dov_fin_all_%1$s', _sid);
    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt.tb_s4dov_finmetrics_%1$s', _sid);
    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt.tb_s4dov_findisc_%1$s', _sid);
	EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt.tb_s4dov_ia_all_%1$s', _sid);
    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt.tb_s4dov_iametrics_%1$s', _sid);
    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt.tb_s4dov_iadisc_%1$s', _sid);
    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt.tb_s4dov_sslevel_%1$s', _sid);
    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt.tb_s4dov_ss_%1$s', _sid);

END;
$function$
;
