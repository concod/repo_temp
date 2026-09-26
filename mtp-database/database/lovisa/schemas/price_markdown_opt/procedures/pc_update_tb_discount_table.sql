--liquibase formatted sql
--changeset keerthana.reddy@impactanalytics.co:pc_update_tb_discount_table_26022026 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_insert_strategy_date_metrics

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_update_tb_discount_table;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_update_tb_discount_table(IN _strategy_id integer,  IN _possible_currency_type text, IN _input_currency_type text,IN _min_stg_disc_id integer, IN _max_stg_disc_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
    DECLARE 
        delete_query text;
        update_query text;
        _min_disc_id integer;
        _max_disc_id integer;
        _fetch_query text;
        _d1_filter_condition text;
        _has_rows boolean;
BEGIN
	EXECUTE FORMAT(
		'SELECT EXISTS (
			SELECT 1
			FROM price_markdown.tb_strategy_discount_%I_%s d
			INNER JOIN price_markdown.tb_strategy_pcd p
				ON d.pcd_id = p.pcd_id
			WHERE d.strategy_id = %s
			AND p.pcd_start_date > CURRENT_DATE
		)',
		_possible_currency_type,   -- %I
		_strategy_id,              -- %s (table suffix)
		_strategy_id               -- %s (WHERE clause)
	)
	INTO _has_rows;

	IF NOT _has_rows THEN
		CALL price_markdown_opt.pc_insert_disc_direct_copy_views(
			_possible_currency_type,
			_input_currency_type,
			_strategy_id
		);
	END IF;

    -- Build the filter condition for d1 based on whether _min_stg_disc_id and _max_stg_disc_id are provided
    IF _min_stg_disc_id = 0 OR _max_stg_disc_id = 0 THEN
        _d1_filter_condition := '1=1';
    ELSE
        _d1_filter_condition := FORMAT('d1.id = %s or d1.id = %s', _min_stg_disc_id, _max_stg_disc_id);
    END IF;

    _fetch_query := FORMAT('
        SELECT min(d3.id) as min_disc_id, max(d3.id) as max_disc_id 
        FROM price_markdown.tb_strategy_discount_%3$s_%1$s d3
        INNER JOIN (select product_level_id, store_level_id, pcd_id 
		from price_markdown.tb_strategy_discount_%2$s_%1$s d1 where %4$s) d2
            ON d2.product_level_id = d3.product_level_id
            AND d2.store_level_id = d3.store_level_id
            AND d2.pcd_id = d3.pcd_id;',
        _strategy_id, _input_currency_type, _possible_currency_type, _d1_filter_condition);
    raise notice 'Fetch query: %', _fetch_query;
    EXECUTE _fetch_query INTO _min_disc_id, _max_disc_id;
    raise notice 'Min disc id: %', _min_disc_id;
    raise notice 'Max disc id: %', _max_disc_id;

    update_query := FORMAT('
		WITH applicable_prices_1 AS ( 
		-- input currency
			SELECT 
				currency_value,
				stat_id,
				currency_id,
				product_level_id,
				store_level_id
			FROM price_markdown_opt.fn_applicable_price_points_reco_level(%1$s, %2$L)
		),
		applicable_prices_2 AS(
		-- possible currency
			SELECT 
				currency_value,
				stat_id,
				currency_id,
				product_level_id,
				store_level_id
			FROM price_markdown_opt.fn_applicable_price_points_reco_level(%1$s, %3$L)
		),
		calculated_values AS (
			SELECT 
				d2.product_level_id,
				d2.store_level_id,
				d2.pcd_id,
				(
					SELECT currency_value 
					FROM applicable_prices_1 ap1
					WHERE ap1.stat_id = (
						SELECT MAX(stat_id) 
						FROM applicable_prices_1 ap2
						WHERE ap2.currency_value = d1.effective_price_point 
						AND ap2.currency_id = d1.currency_id
						AND ap2.product_level_id = d1.product_level_id
						AND ap2.store_level_id = d1.store_level_id
					) 
					AND ap1.currency_id = d2.currency_id
					AND ap1.product_level_id = d1.product_level_id
					AND ap1.store_level_id = d1.store_level_id
					LIMIT 1
				) AS new_effective_price_point,
				(
					SELECT ROUND(AVG(100 * (1 - (
						SELECT currency_value 
					FROM applicable_prices_2 ap3
					WHERE ap3.stat_id = (
						SELECT MAX(stat_id) 
						FROM applicable_prices_2 ap4
						WHERE ap4.currency_value = d1.effective_price_point 
						AND ap4.currency_id = d1.currency_id
						AND ap4.product_level_id = d1.product_level_id
						AND ap4.store_level_id = d1.store_level_id
					) 
					AND ap3.currency_id = d2.currency_id
					AND ap3.product_level_id = d1.product_level_id
					AND ap3.store_level_id = d1.store_level_id
					LIMIT 1
					) / price_with_vat)))
					FROM (
						SELECT 
							ssm.product_id,
							ssm.store_id,
							CASE 
								WHEN ''%2$s'' = ''local'' THEN psp.msrp_with_vat
								WHEN ''%2$s'' = ''global'' THEN psp.msrp_default_with_vat
								WHEN ''%2$s'' = ''dominating'' THEN psp.msrp_territory_with_vat
							END AS price_with_vat
						FROM price_markdown.tb_strategy_sku_store_mapping_%1$s ssm
						LEFT JOIN price_markdown.tb_product_store_price psp
							ON ssm.product_id = psp.product_id 
							AND ssm.store_id = psp.store_id
						WHERE ssm.product_level_id = d2.product_level_id
						AND ssm.store_level_id = d2.store_level_id
					) price_data
				) AS new_markdown_percentage,
				d1.is_locked,
				d1.action_status,
				d1.approval_status
			FROM price_markdown.tb_strategy_discount_%3$s_%1$s d2
			INNER JOIN price_markdown.tb_strategy_discount_%2$s_%1$s d1
				ON d1.product_level_id = d2.product_level_id
				AND d1.store_level_id = d2.store_level_id
				AND d1.pcd_id = d2.pcd_id
			INNER JOIN price_markdown.tb_strategy_sku_store_mapping_%1$s ssm
			ON ssm.product_level_id = d1.product_level_id
				AND ssm.store_level_id = d1.store_level_id
			INNER JOIN pricesmart.tb_store_master sm
			ON ssm.store_id = sm.store_id
			WHERE d2.id >= %4$s and d2.id <= %5$s
			and %6$s
		)
		UPDATE price_markdown.tb_strategy_discount_%3$s_%1$s d2
		SET 
			effective_price_point = cv.new_effective_price_point,
			markdown_percentage = cv.new_markdown_percentage,
			is_locked = cv.is_locked,
			action_status = cv.action_status,
			approval_status = cv.approval_status
		FROM calculated_values cv
		WHERE d2.product_level_id = cv.product_level_id
		AND d2.store_level_id = cv.store_level_id
		AND d2.pcd_id = cv.pcd_id
		AND d2.id >= %4$s and d2.id <= %5$s;

        -- Update previous_markdown_percentage and incremental_discount using CTE with window function
        WITH prev_disc AS (
            SELECT 
                product_level_id,
                store_level_id,
                pcd_id,
                LAG(markdown_percentage) OVER (
                    PARTITION BY product_level_id, store_level_id 
                    ORDER BY pcd_id
                ) AS prev_mkd_perc
            FROM price_markdown.tb_strategy_discount_%3$s_%1$s
            WHERE id >= %4$s and id <= %5$s
        )
        UPDATE price_markdown.tb_strategy_discount_%3$s_%1$s d2
        SET 
            previous_markdown_percentage = COALESCE(pd.prev_mkd_perc, 0),
            incremental_discount = d2.markdown_percentage - COALESCE(pd.prev_mkd_perc, 0)
        FROM prev_disc pd
        WHERE d2.product_level_id = pd.product_level_id
          AND d2.store_level_id = pd.store_level_id
          AND d2.pcd_id = pd.pcd_id
          AND d2.id >= %4$s and d2.id <= %5$s;', 
        _strategy_id, _input_currency_type, _possible_currency_type, _min_disc_id, _max_disc_id, _d1_filter_condition);	
    RAISE NOTICE 'Updating data in tb_strategy_discount_%_% table', _possible_currency_type, _strategy_id;
    RAISE NOTICE 'Update query: %', update_query;
    EXECUTE update_query;

END;
$procedure$
;
