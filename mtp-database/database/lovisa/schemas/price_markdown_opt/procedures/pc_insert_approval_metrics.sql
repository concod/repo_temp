--liquibase formatted sql
--changeset keerthana.reddy@impactanalytics.co:pc_insert_approval_metrics_06012026 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: pc_insert_approval_metrics_2

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_insert_approval_metrics;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_insert_approval_metrics(
	IN _strategy_id integer, 
	IN _currency_type text DEFAULT 'global'::text,
	IN _product_level_id integer[] DEFAULT NULL::integer[],
	IN _store_level_id integer[] DEFAULT NULL::integer[])
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
DECLARE 
	delete_query text;
	inv_table text;
	products_base_table text;
	inv_base_table text;
	temp_table_1 text;
	ia_temp_table text;
	fin_temp_table text;
	base_temp_table text;
	final_temp_table text;
	temp_table_1_idx text;
	ia_temp_table_idx text;
	fin_temp_table_idx text;
	base_temp_table_idx text;
	insert_query text;
	_start_time text;
	_formatted_where_clause text;   
	_formatted_product_level_id_clause text;
	_formatted_store_level_id_clause text;
	sku_store_temp_table text;
BEGIN
	IF _product_level_id IS NULL THEN 
	_formatted_product_level_id_clause = 'true';
	ELSE
	_formatted_product_level_id_clause = FORMAT('product_level_id IN (%s)', array_to_string(_product_level_id, ','));
	END IF;
	
	IF _store_level_id IS NULL THEN 
	_formatted_store_level_id_clause = 'true';
	ELSE
	_formatted_store_level_id_clause = FORMAT('store_level_id IN (%s)', array_to_string(_store_level_id, ','));
	END IF;

	_formatted_where_clause = FORMAT('WHERE %s AND %s', _formatted_product_level_id_clause, _formatted_store_level_id_clause);
		RAISE NOTICE '_formatted_where_clause : %', _formatted_where_clause;

	delete_query = FORMAT('DELETE FROM price_markdown.tb_approval_metrics_%2$s_%1$s
				%3$s;',  _strategy_id, _currency_type, _formatted_where_clause);
	RAISE NOTICE 'Deleted selected data from tb_approval_metrics';
	EXECUTE delete_query;

	_start_time = to_char(clock_timestamp(), 'YYYYMMDD_HH24MISSMS');
	RAISE NOTICE 'start_time : %', _start_time;

	sku_store_temp_table = FORMAT('CREATE UNLOGGED TABLE price_markdown_opt_temp.tb_stg_sku_store_mapping_%3$s_%1$s
						AS
						(SELECT strategy_id, product_id, store_id, product_level_id, store_level_id, channel_info, 
						CASE WHEN ''%3$s'' = ''local'' THEN ccm.currency_id 
						WHEN ''%3$s'' = ''dominating'' THEN ccm.dominating_currency_id
						WHEN ''%3$s'' = ''global'' THEN ccm.default_currency_id
						END AS currency_id, 
						price * ar.planned_conversion_multiplier AS price,
						price_with_vat * ar.planned_conversion_multiplier AS price_with_vat,
						cost * ar.planned_conversion_multiplier AS cost
						FROM price_markdown.tb_strategy_sku_store_mapping_%1$s ss
						LEFT JOIN (SELECT store_id, s1_id AS country_id, s0_id AS territory_id
						FROM price_markdown.tb_Store_master) sm
						USING(store_id)
						LEFT JOIN global.tb_country_currency_mapping ccm
						USING(territory_id, country_id)
						LEFT JOIN (SELECT * FROM global.actual_forex_rate WHERE date = (SELECT MAX(date) FROM global.actual_forex_rate)) ar
						ON ar.source_currency_id = ss.currency_id 
						AND ar.target_currency_id = CASE WHEN ''%3$s'' = ''local'' THEN ccm.currency_id 
						WHEN ''%3$s'' = ''dominating'' THEN ccm.dominating_currency_id
						WHEN ''%3$s'' = ''global'' THEN ccm.default_currency_id
						END)', _strategy_id, _start_time, _currency_type);
	RAISE NOTICE 'sku_store_temp_table : %', sku_store_temp_table;
	EXECUTE sku_store_temp_table;

	temp_table_1 = FORMAT('CREATE UNLOGGED TABLE price_markdown_opt_temp.stg_pcd_temp_%1$s_%2$s
					AS
					(
					SELECT sd.strategy_id, sd.product_level_id, sd.store_level_id, sd.pcd_id, pcd_start_date, pcd_end_date, sd.channel_info,
					approval_status AS status, sd.markdown_type AS fin_markdown_type, sd.average_retail_price, sdi.markdown_type AS ia_markdown_type, action_status,
					sd.markdown_percentage AS fin_discount, sdi.markdown_percentage AS ia_discount, pcd_number,
					COALESCE(LAG(sdi.markdown_type) OVER (PARTITION BY product_level_id, sd.store_level_id ORDER BY pcd_start_date), ''REGULAR PRICE'') AS ia_previous_markdown_type,
					COALESCE(LAG(sd.markdown_type) OVER (PARTITION BY product_level_id, sd.store_level_id ORDER BY pcd_start_date), ''REGULAR PRICE'') AS fin_previous_markdown_type,
					sd.currency_id, sd.average_retail_price_with_vat
					FROM price_markdown.tb_strategy_discount_%3$s_%1$s sd
					LEFT JOIN price_markdown.tb_strategy_discount_ia_%3$s_%1$s sdi
					USING(product_level_id, store_level_id, pcd_id)
					JOIN (SELECT pcd_id, pcd_start_date, pcd_end_date, DENSE_RANK() OVER (PARTITION BY strategy_id ORDER BY pcd_start_date) pcd_number
					FROM price_markdown.tb_strategy_pcd
					WHERE strategy_id = %1$s) sp
					USING(pcd_id)
					%4$s
					)', _strategy_id, _start_time, _currency_type, _formatted_where_clause);
	RAISE NOTICE 'temp_table_1 query : %', temp_table_1;
	EXECUTE temp_table_1;
	temp_table_1_idx = FORMAT('
	CREATE INDEX idx_stg_pcd_temp_%1$s_%2$s
	ON price_markdown_opt_temp.stg_pcd_temp_%1$s_%2$s (strategy_id, product_level_id, store_level_id, pcd_id);', _strategy_id, _start_time);
	RAISE NOTICE 'temp_table_1_idx : %', temp_table_1_idx;
	EXECUTE temp_table_1_idx;

	inv_table = FORMAT('CREATE UNLOGGED TABLE price_markdown_opt_temp.inv_temp_%1$s_%2$s
						AS
						(SELECT tsssm.product_level_id, tsssm.store_level_id, tsssm.channel_info, tsssm.currency_id,
						COUNT(DISTINCT tli.store_id) AS stores_with_inventory, SUM(tli.total_inventory) AS inv,
						CASE WHEN SUM(tli.total_inventory) > 0 THEN (SUM(tsssm.price * tli.total_inventory) / SUM(tli.total_inventory))
															ELSE AVG(tsssm.price) END AS retail_price,
						CASE WHEN SUM(tli.total_inventory) > 0 THEN (SUM(tsssm.price_with_vat * tli.total_inventory) / SUM(tli.total_inventory))
															ELSE AVG(tsssm.price_with_vat) END AS retail_price_with_vat
							FROM global.tb_latest_inventory tli
							INNER JOIN price_markdown_opt_temp.tb_stg_sku_store_mapping_%3$s_%1$s tsssm
							USING(product_id, store_id)
							%4$s
							GROUP BY 1,2,3,4)', _strategy_id, _start_time, _currency_type, _formatted_where_clause);
	RAISE NOTICE 'inv table : %', inv_table;
	EXECUTE inv_table;

	products_base_table = FORMAT('CREATE UNLOGGED TABLE price_markdown_opt_temp.approval_prod_base_temp_%1$s_%2$s
						AS
						(SELECT strategy_id, tsssm.currency_id, 
						tsssm.product_level_id, tsssm.store_level_id, 
						tsssm.channel_info AS channel_info,
						ARRAY_AGG(DISTINCT pm.l1_cuq) AS dept,
						ARRAY_AGG(DISTINCT pm.l2_cuq) AS sub_dept,
						ARRAY_AGG(DISTINCT pm.brand) AS mfg,
						ARRAY_AGG(DISTINCT pm.l3_cuq) AS class,
						ARRAY_AGG(DISTINCT pm.l0_name) AS brand,
						ROUND(AVG(tsssm.price::numeric),2) AS base_price, 
						AVG(tsssm.cost) AS cost,
						CASE WHEN channel_info = ''Omni'' THEN AVG(max_age)
								WHEN channel_info = ''Store'' THEN AVG(store_age)
								ELSE AVG(ecom_age) END AS age,
						ROUND(AVG(tsssm.price_with_vat::numeric),2) AS base_price_with_vat 
							FROM price_markdown_opt_temp.tb_stg_sku_store_mapping_%3$s_%1$s tsssm
							INNER JOIN (SELECT product_id, currency_id, l0_name, l1_cuq, l2_cuq, brand, l3_cuq, org_brand, 
							COALESCE(store_age, 0) store_age, 
							COALESCE(ecom_age, 0) ecom_age,
							COALESCE(max_age, 0) AS max_age
							FROM price_markdown.product_master) pm
							ON tsssm.product_id = pm.product_id
							%4$s
							GROUP BY 1,2,3,4,5)', _strategy_id, _start_time, _currency_type, _formatted_where_clause);
	RAISE NOTICE 'products_base_table : %', products_base_table;
	EXECUTE products_base_table;

	inv_base_table = FORMAT('CREATE UNLOGGED TABLE price_markdown_opt_temp.approval_inv_base_temp_%1$s_%2$s
							AS
							(SELECT product_level_id, pcd_id, store_level_id, SUM(COALESCE(ia.inv,0)) AS ia_inv, SUM(COALESCE(fin.inv,0)) AS fin_inv
							FROM
							price_markdown_opt_temp.stg_pcd_temp_%1$s_%2$s spt
							LEFT JOIN
							(SELECT product_level_id, store_level_id, pcd_id, COALESCE(MIN(rem_inv) + SUM(sales_units),0) AS inv
							FROM price_markdown.tb_agg_ia_%3$s_%1$s GROUP BY 1,2,3) ia
							USING(product_level_id, store_level_id, pcd_id)
							LEFT JOIN
							(SELECT product_level_id, store_level_id, pcd_id, COALESCE(MIN(rem_inv) + SUM(sales_units),0) AS inv
							FROM price_markdown.tb_agg_fin_%3$s_%1$s GROUP BY 1,2,3) fin
							USING(product_level_id, store_level_id, pcd_id)
							GROUP BY 1,2,3)', _strategy_id, _start_time, _currency_type);
		RAISE NOTICE 'inv_base_table : %', inv_base_table;
		EXECUTE inv_base_table;

	ia_temp_table = FORMAT('CREATE UNLOGGED TABLE price_markdown_opt_temp.ia_metrics_temp_%1$s_%2$s AS
							SELECT *,
							COALESCE(LAG(ia_discount) OVER (PARTITION BY product_level_id, store_level_id ORDER BY pcd_start_date),0) AS ia_previous_discount,
							COALESCE(LAG(ia_pcd_price) OVER (PARTITION BY product_level_id, store_level_id ORDER BY pcd_start_date), retail_price) AS ia_previous_pcd_price,
							COALESCE(LAG(ia_pcd_price_with_vat) OVER (PARTITION BY product_level_id, store_level_id ORDER BY pcd_start_date), retail_price_with_vat) AS ia_previous_pcd_price_with_vat
							FROM
								(SELECT sp.strategy_id, sp.currency_id, sp.product_level_id, sp.store_level_id, sp.pcd_id, sp.channel_info, sp.pcd_start_date,
								AVG(retail_price) AS retail_price,
								COALESCE(CASE WHEN SUM(inv) > 0 THEN (SUM(effective_price_point * inv) / SUM(inv))
																ELSE AVG(effective_price_point) END,
																AVG(average_retail_price*(100-ia_discount)/100)) AS ia_pcd_price,
								COALESCE(SUM(sales_units),0) AS ia_units,
								COALESCE(SUM(revenue),0) AS ia_revenue,
								COALESCE(SUM(margin),0) AS ia_margin,
								COALESCE(SUM(spend),0) AS ia_markdown_spend,
								COALESCE(MIN(rem_inv) + SUM(sales_units),0) AS ia_inventory,
								ARRAY_AGG(DISTINCT ia_markdown_type) ia_markdown_type,
								ARRAY_AGG(DISTINCT ia_previous_markdown_type) ia_previous_markdown_type,
								CASE WHEN SUM(inv) > 0 THEN SUM(ia_discount*inv)/SUM(inv)
										ELSE AVG(ia_discount) END AS ia_discount,
								AVG(retail_price_with_vat) AS retail_price_with_vat,
								COALESCE(CASE WHEN SUM(inv) > 0 THEN (SUM(effective_price_point_with_vat * inv) / SUM(inv))
																	ELSE AVG(effective_price_point_with_vat) END,
																	AVG(average_retail_price_with_vat*(100-ia_discount)/100)) AS ia_pcd_price_with_vat,
								COALESCE(SUM(revenue_with_vat),0) AS ia_revenue_with_vat,
								COALESCE(SUM(margin_with_vat),0) AS ia_margin_with_vat,
								COALESCE(SUM(spend_with_vat),0) AS ia_markdown_spend_with_vat
								FROM (
									SELECT strategy_id, currency_id, channel_info, product_level_id, store_level_id, pcd_id, pcd_start_date, ia_discount,
									ia_markdown_type, ia_previous_markdown_type, average_retail_price, average_retail_price_with_vat 
									FROM price_markdown_opt_temp.stg_pcd_temp_%1$s_%2$s) sp
									LEFT JOIN price_markdown.tb_agg_ia_%3$s_%1$s
									USING(product_level_id, store_level_id, pcd_id)
								LEFT JOIN price_markdown_opt_temp.inv_temp_%1$s_%2$s i
								ON sp.product_level_id = i.product_level_id
								AND sp.store_level_id = i.store_level_id
								GROUP BY 1,2,3,4,5,6,7) ia_m', _strategy_id, _start_time, _currency_type);
	RAISE NOTICE 'ia_temp_table created : %', ia_temp_table;
	EXECUTE ia_temp_table;
	ia_temp_table_idx = FORMAT('
		CREATE INDEX idx_ia_metrics_temp_%1$s_%2$s
		ON price_markdown_opt_temp.ia_metrics_temp_%1$s_%2$s (strategy_id, product_level_id, pcd_id, store_level_id);', _strategy_id, _start_time);
	RAISE NOTICE 'ia_temp_table_idx : %', ia_temp_table_idx;
	execute ia_temp_table_idx;

	fin_temp_table = FORMAT('CREATE UNLOGGED TABLE price_markdown_opt_temp.fin_metrics_temp_%1$s_%2$s
							AS
							SELECT *,
							COALESCE(LAG(fin_discount) OVER (PARTITION BY product_level_id, store_level_id ORDER BY pcd_start_date),0) AS fin_previous_discount,
							COALESCE(LAG(fin_pcd_price) OVER (PARTITION BY product_level_id, store_level_id ORDER BY pcd_start_date), retail_price) AS fin_previous_pcd_price,
							COALESCE(LAG(fin_pcd_price_with_vat) OVER (PARTITION BY product_level_id, store_level_id ORDER BY pcd_start_date), retail_price_with_vat) AS fin_previous_pcd_price_with_vat
							FROM
								(SELECT sp.strategy_id, sp.currency_id, sp.product_level_id, sp.store_level_id, sp.pcd_id, sp.channel_info, sp.pcd_start_date,
								AVG(retail_price) AS retail_price,
								COALESCE(CASE WHEN SUM(sales_units) > 0 THEN (SUM(effective_price_point * sales_units) / SUM(sales_units))
																	ELSE AVG(effective_price_point) END,
																	AVG(average_retail_price*(100-fin_discount)/100)) AS fin_pcd_price,
								COALESCE(SUM(sales_units),0) AS fin_units,
								COALESCE(SUM(revenue),0) AS fin_revenue,
								COALESCE(SUM(margin),0) AS fin_margin,
								COALESCE(SUM(spend),0) AS fin_markdown_spend,
								COALESCE(MIN(rem_inv) + SUM(sales_units),0) AS fin_inventory,
								ARRAY_AGG(DISTINCT fin_markdown_type) fin_markdown_type,
								ARRAY_AGG(DISTINCT fin_previous_markdown_type) fin_previous_markdown_type,
								CASE WHEN SUM(inv) > 0 THEN SUM(fin_discount*inv)/SUM(inv)
									ELSE AVG(fin_discount) END AS fin_discount,
								AVG(retail_price_with_vat) AS retail_price_with_vat,
								COALESCE(CASE WHEN SUM(sales_units) > 0 THEN (SUM(effective_price_point_with_vat * sales_units) / SUM(sales_units))
																	ELSE AVG(effective_price_point_with_vat) END,
																	AVG(average_retail_price_with_vat*(100-fin_discount)/100)) AS fin_pcd_price_with_vat,
								COALESCE(SUM(revenue_with_vat),0) AS fin_revenue_with_vat,
								COALESCE(SUM(margin_with_vat),0) AS fin_margin_with_vat,
								COALESCE(SUM(spend_with_vat),0) AS fin_markdown_spend_with_vat
								FROM (
									SELECT strategy_id, currency_id, channel_info, product_level_id, store_level_id, pcd_id, pcd_start_date, fin_discount,
									fin_markdown_type, fin_previous_markdown_type, average_retail_price, average_retail_price_with_vat FROM price_markdown_opt_temp.stg_pcd_temp_%1$s_%2$s) sp
									LEFT JOIN price_markdown.tb_agg_fin_%3$s_%1$s
									USING(product_level_id, store_level_id, pcd_id)
								LEFT JOIN price_markdown_opt_temp.inv_temp_%1$s_%2$s i
								ON sp.product_level_id = i.product_level_id
								AND sp.store_level_id = i.store_level_id
								GROUP BY 1,2,3,4,5,6,7) fin_m', _strategy_id, _start_time, _currency_type);
	RAISE NOTICE 'fin_temp_table created : %', fin_temp_table;
	EXECUTE fin_temp_table;
	fin_temp_table_idx = FORMAT('
		CREATE INDEX idx_fin_metrics_temp_%1$s_%2$s
		ON price_markdown_opt_temp.fin_metrics_temp_%1$s_%2$s (strategy_id, product_level_id, pcd_id, store_level_id);', _strategy_id, _start_time);
	RAISE NOTICE 'fin_temp_table_idx : %', fin_temp_table_idx;
	execute fin_temp_table_idx;

	base_temp_table = FORMAT('CREATE UNLOGGED TABLE price_markdown_opt_temp.base_temp_%1$s_%2$s
							AS
								(SELECT strategy_id, a.currency_id, product_level_id, store_level_id, pcd_id, a.pcd_start_date, pcd_end_date, a.channel_info, pcd_number,
								status, action_status, stores_with_inventory,
								ia.ia_markdown_type,
								fin.fin_markdown_type,
								ia.ia_discount,
								fin.fin_discount,
								ia.ia_pcd_price,
								fin.fin_pcd_price,
								ia_units,
								fin_units,
								ia_revenue,
								fin_revenue,
								ia_margin,
								fin_margin,
								ia_markdown_spend,
								fin_markdown_spend,
								ia_inventory,
								fin_inventory,
								ia_previous_discount, fin_previous_discount,
								ia_previous_markdown_type,
								fin_previous_markdown_type,
								ia_previous_pcd_price, fin_previous_pcd_price,
								ia.ia_pcd_price_with_vat, fin.fin_pcd_price_with_vat,
								ia_revenue_with_vat, fin_revenue_with_vat,
								ia_margin_with_vat, fin_margin_with_vat,
								ia_markdown_spend_with_vat, fin_markdown_spend_with_vat,
								ia_previous_pcd_price_with_vat, fin_previous_pcd_price_with_vat
								FROM (SELECT DISTINCT strategy_id, currency_id, product_level_id, store_level_id, pcd_id, pcd_start_date, pcd_end_date, channel_info, pcd_number,
								status, action_status FROM price_markdown_opt_temp.stg_pcd_temp_%1$s_%2$s
								WHERE status != ''Not Approved'') a
								JOIN price_markdown_opt_temp.fin_metrics_temp_%1$s_%2$s fin
								USING(strategy_id, product_level_id, pcd_id, store_level_id)
								LEFT JOIN price_markdown_opt_temp.ia_metrics_temp_%1$s_%2$s ia
								USING(strategy_id, product_level_id, pcd_id, store_level_id)
								LEFT JOIN (SELECT product_level_id, store_level_id, SUM(stores_with_inventory) stores_with_inventory
											FROM price_markdown_opt_temp.inv_temp_%1$s_%2$s GROUP BY 1,2) i
								USING(product_level_id, store_level_id)
								)', _strategy_id, _start_time);
	RAISE NOTICE 'base_temp_table : %', base_temp_table;
	EXECUTE base_temp_table;
	RAISE NOTICE 'base temp table created';
	base_temp_table_idx = FORMAT('
		CREATE INDEX idx_base_temp_%1$s_%2$s
		ON price_markdown_opt_temp.base_temp_%1$s_%2$s (strategy_id, product_level_id, pcd_id, store_level_id);', _strategy_id, _start_time);
	RAISE NOTICE 'base_temp_table_idx : %', base_temp_table_idx;
	execute base_temp_table_idx;

	final_temp_table = FORMAT('CREATE UNLOGGED TABLE price_markdown_opt_temp.approval_final_temp_%1$s_%2$s
							AS
								(SELECT strategy_id, product_level_id, store_level_id, pcd_id, pcd_start_date, pcd_end_date, 
								bt.channel_info, pcd_number,
								status, action_status, stores_with_inventory,
								ia_markdown_type,
								fin_markdown_type,
								ia_discount,
								fin_discount,
								ia_pcd_price,
								fin_pcd_price,
								ia_units,
								fin_units,
								ia_revenue,
								fin_revenue,
								ia_margin,
								fin_margin,
								ia_markdown_spend,
								fin_markdown_spend,
								ia_inv AS ia_inventory,
								fin_inv AS fin_inventory,
								ia_previous_discount, fin_previous_discount,
								ia_previous_markdown_type,
								fin_previous_markdown_type,
								ia_previous_pcd_price, fin_previous_pcd_price,
								dept, sub_dept, class, brand, mfg, base_price, (ia_inventory*cost) AS ia_inventory_cost, (fin_inventory*cost) AS fin_inventory_cost,
								ROUND(age) AS age,
								bt.currency_id,
								ia_pcd_price_with_vat, fin_pcd_price_with_vat,
								ia_revenue_with_vat, fin_revenue_with_vat,
								ia_margin_with_vat, fin_margin_with_vat,
								ia_markdown_spend_with_vat, fin_markdown_spend_with_vat,
								ia_previous_pcd_price_with_vat, fin_previous_pcd_price_with_vat,
								base_price_with_vat
								FROM price_markdown_opt_temp.base_temp_%1$s_%2$s bt
								JOIN price_markdown_opt_temp.approval_prod_base_temp_%1$s_%2$s apb
								USING(strategy_id, product_level_id, store_level_id)
								JOIN price_markdown_opt_temp.approval_inv_base_temp_%1$s_%2$s
								USING(product_level_id, pcd_id, store_level_id)
								)', _strategy_id, _start_time);
	RAISE NOTICE 'final_temp_table : %', final_temp_table;
	EXECUTE final_temp_table;
	insert_query = FORMAT(' INSERT INTO price_markdown.tb_approval_metrics_%3$s_%1$s
							(SELECT strategy_id, product_level_id, store_level_id, pcd_id, pcd_start_date, pcd_end_date,
							channel_info, ia_markdown_type, fin_markdown_type, stores_with_inventory,
							status, ia_discount, fin_discount, ia_previous_discount, fin_previous_discount,
							ia_pcd_price, fin_pcd_price,
							CASE WHEN ia_previous_discount = 100 OR ia_discount = ia_previous_discount THEN 0 ELSE
							(ia_discount-ia_previous_discount)*100/(100-ia_previous_discount) END AS ia_incremental_discount,
							CASE WHEN fin_previous_discount = 100 OR fin_discount = fin_previous_discount THEN 0 ELSE
							(fin_discount-fin_previous_discount)*100/(100-fin_previous_discount) END AS fin_incremental_discount,
							ia_previous_pcd_price, fin_previous_pcd_price,
							ia_units, fin_units, ia_revenue, fin_revenue, ia_margin, fin_margin,
							COALESCE(ia_margin/NULLIF(ia_revenue,0),0)*100 AS ia_gm_percent,
							COALESCE(fin_margin/NULLIF(fin_revenue,0),0)*100 AS fin_gm_percent,
							COALESCE(ia_units/NULLIF(ia_inventory,0),0)*100 AS ia_sellthrough,
							COALESCE(fin_units/NULLIF(fin_inventory,0),0)*100 AS fin_sellthrough,
							COALESCE(ia_margin/NULLIF(ia_units,0),0) AS ia_aum,
							COALESCE(fin_margin/NULLIF(fin_units,0),0) AS fin_aum,
							ia_markdown_spend, fin_markdown_spend, ia_inventory, fin_inventory, action_status, ia_previous_markdown_type,
							fin_previous_markdown_type, pcd_number,
							dept, class, brand, mfg, base_price, ia_inventory_cost, fin_inventory_cost, CURRENT_TIMESTAMP AS updated_at, age,
							currency_id, ia_pcd_price_with_vat, fin_pcd_price_with_vat, ia_previous_pcd_price_with_vat, fin_previous_pcd_price_with_vat,
							ia_revenue_with_vat, fin_revenue_with_vat, ia_margin_with_vat, fin_margin_with_vat,
							COALESCE(ia_margin_with_vat/NULLIF(ia_units,0),0) AS ia_aum_with_vat, 
							COALESCE(fin_margin_with_vat/NULLIF(fin_units,0),0) AS fin_aum_with_vat,
							ia_markdown_spend_with_vat, fin_markdown_spend_with_vat,
							base_price_with_vat, sub_dept
							FROM price_markdown_opt_temp.approval_final_temp_%1$s_%2$s)', _strategy_id, _start_time, _currency_type);
	RAISE NOTICE 'inserted into approval metrics : %', insert_query;
	EXECUTE insert_query;

	EXECUTE FORMAT('DROP TABLE IF EXISTS price_markdown_opt_temp.stg_pcd_temp_%1$s_%2$s', _strategy_id, _start_time);
	EXECUTE FORMAT('DROP TABLE IF EXISTS price_markdown_opt_temp.approval_prod_base_temp_%1$s_%2$s', _strategy_id, _start_time);
	EXECUTE FORMAT('DROP TABLE IF EXISTS price_markdown_opt_temp.approval_inv_base_temp_%1$s_%2$s', _strategy_id, _start_time);
	EXECUTE FORMAT('DROP TABLE IF EXISTS price_markdown_opt_temp.ia_metrics_temp_%1$s_%2$s', _strategy_id, _start_time);
	EXECUTE FORMAT('DROP TABLE IF EXISTS price_markdown_opt_temp.fin_metrics_temp_%1$s_%2$s', _strategy_id, _start_time);
	EXECUTE FORMAT('DROP TABLE IF EXISTS price_markdown_opt_temp.base_temp_%1$s_%2$s', _strategy_id, _start_time);
	EXECUTE FORMAT('DROP TABLE IF EXISTS price_markdown_opt_temp.inv_temp_%1$s_%2$s', _strategy_id, _start_time);
	EXECUTE FORMAT('DROP INDEX IF EXISTS price_markdown_opt_temp.idx_stg_pcd_temp_%1$s_%2$s', _strategy_id, _start_time);
	EXECUTE FORMAT('DROP INDEX IF EXISTS price_markdown_opt_temp.idx_ia_metrics_temp_%1$s_%2$s', _strategy_id, _start_time);
	EXECUTE FORMAT('DROP INDEX IF EXISTS price_markdown_opt_temp.idx_fin_metrics_temp_%1$s_%2$s', _strategy_id, _start_time);
	EXECUTE FORMAT('DROP INDEX IF EXISTS price_markdown_opt_temp.idx_base_temp_%1$s_%2$s', _strategy_id, _start_time);
	EXECUTE FORMAT('DROP TABLE IF EXISTS price_markdown_opt_temp.approval_final_temp_%1$s_%2$s', _strategy_id, _start_time);
	EXECUTE FORMAT('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_stg_sku_store_mapping_%2$s_%1$s', _strategy_id, _currency_type);

	RAISE NOTICE 'Dropped all temp tables';

END;
$procedure$
;
