--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:fn_step3_price_file runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for fn_step3_price_file

DROP FUNCTION if exists price_promo_opt.fn_step3_price_file;
CREATE OR REPLACE FUNCTION price_promo_opt.fn_step3_price_file(_promo_id integer, _use_applicable_price_points boolean DEFAULT false)
 RETURNS TABLE("Product Name" text, "Brand" text, "Division" text, "Department" text, "Class" text, "Sub Class" text, "Style" text, "Customer Choice" text, "Base Price" numeric, "Scenario" text, "Finalized Flag" text, "Offer Type" text, "Offer Value" text, "Units" numeric, "Revenue" numeric, "Margin" numeric, "GM%" numeric, "On Hand" numeric, "In Transit" numeric, "Baseline Units" numeric, "Baseline Revenue" numeric, "Baseline Margin" numeric, "Baseline GM%" numeric, "Incremental Units" numeric, "Incremental Revenue" numeric, "Incremental Margin" numeric, "Incremental GM%" numeric)
 LANGUAGE plpgsql
AS $function$
/*
Purpose: Generates a price file for a specific promotion with price point optimization.
         This function applies business rules for price calculations and maps prices to
         acceptable price points based on brand/country requirements.

Example: SELECT * FROM price_promo_opt.fn_step3_price_file(123, true);

Other Functions Used:
- price_promo.fn_fetch_stores_for_promo: For retrieving stores applicable to the promotion

Tables Used:
- price_promo.promo_master: For promotion details
- price_promo.ps_rules: For discount level settings
- price_promo.tb_discount_level_products: For product filtering
- price_promo.tb_discount_level_stores: For store filtering
- price_promo.tb_acceptable_price_points: For price point mapping
- global.planned_forex_rate: For currency conversion rates

Behavior:
1. Determines if all products/stores should be included based on discount level settings
2. Calculates forex multiplier for currency conversion
3. Applies appropriate discount based on offer type
4. Maps prices to acceptable price points if _use_applicable_price_points is true
5. Returns formatted price file data ready for integration

Returns: Table with promotion price file data including both primary and secondary currency values
*/
DECLARE
    dyn_sql TEXT;
    _promo_product_table TEXT := quote_ident('price_promo') || '.' || quote_ident('promo_product_' || _promo_id);
    _forex_multiplier FLOAT;
    _start_date DATE;
    _end_date DATE;
    use_cte_logic TEXT := '';
    price_expr_primary TEXT;
    price_expr_secondary TEXT;
    final_cte TEXT;
    groupby_additions TEXT := '';
    _scenario_ids_str TEXT;
    _use_all_products BOOLEAN;
    _use_all_stores BOOLEAN;
    product_join_sql TEXT;
    store_join_sql TEXT;
BEGIN
    -- Check if ps_rules has -200 as values for product_discount_level
    SELECT EXISTS (
        SELECT 1 FROM price_promo.ps_rules pr 
        WHERE pr.promo_id = _promo_id AND 
        -200 = ANY(pr.product_discount_level)
    ) INTO _use_all_products;
    
    -- Check if ps_rules has -200 as values for store_discount_level
    SELECT EXISTS (
        SELECT 1 FROM price_promo.ps_rules pr 
        WHERE pr.promo_id = _promo_id AND 
        -200 = ANY(pr.store_discount_level)
    ) INTO _use_all_stores;
    
    -- Fetch promo dates
    SELECT start_date, end_date INTO _start_date, _end_date
    FROM price_promo.promo_master
    WHERE promo_id = _promo_id;

    -- Get scenario_ids of the promo as a comma-separated string
    SELECT string_agg(scenario_id::text, ',')
    INTO _scenario_ids_str
    FROM price_promo.scenario_master
    WHERE promo_id = _promo_id;
    
    -- Define product join SQL based on _use_all_products flag
    IF _use_all_products THEN
        -- When using all products, join directly with promo_products
        product_join_sql := 'CROSS JOIN promo_products pp';
    ELSE
        -- When filtering by discount level, join through tb_discount_level_products
        product_join_sql := 'JOIN price_promo.tb_discount_level_products dlp ON dlp.product_level_id = se.product_level_id 
                             JOIN promo_products pp ON dlp.product_id = pp.product_id';
    END IF;
    
    -- Define store join SQL based on _use_all_stores flag
    IF _use_all_stores THEN
        -- When using all stores, join directly with promo_stores
        store_join_sql := 'CROSS JOIN promo_stores ps';
    ELSE
        -- When filtering by discount level, join through tb_discount_level_stores
        store_join_sql := 'JOIN price_promo.tb_discount_level_stores dls ON dls.store_level_id = se.store_level_id 
                           JOIN promo_stores ps ON dls.store_id = ps.store_id';
    END IF;

    -- Compute average forex multiplier
    SELECT COALESCE(AVG(planned_conversion_multiplier),1.17) INTO _forex_multiplier
    FROM global.planned_forex_rate
    WHERE date BETWEEN _start_date AND _end_date
      AND source_currency_id = 4  -- This is GBP (UK primary currency)
      AND target_currency_id = 3; -- This is EUR (UK secondary currency)

    IF _use_applicable_price_points THEN
        use_cte_logic := format($$
            , primary_mapped AS (
                SELECT 
                    bd.*,
                    CASE
                        WHEN offer_type IN ('percent_off', 'extra_amount_off', 'fixed_price', 'upto_x_percent_off') THEN (
                            SELECT price
                            FROM price_promo.tb_acceptable_price_points app
                            WHERE app.l0_cid = bd.l0_cid
                            AND app.price <= bd.raw_price
                            ORDER BY app.price DESC
                            LIMIT 1
                        )
                        ELSE list_price
                    END AS mapped_price
                FROM base_data bd
            ), secondary_mapped AS (
                SELECT 
                    pm.*,
                    CASE 
                        WHEN pm.l0_cid = 5 THEN (
                            SELECT price::numeric
                            FROM price_promo.tb_acceptable_price_points app
                            WHERE app.l0_cid = 5
                            AND app.price <= (pm.mapped_price * %s)
                            ORDER BY app.price DESC
                            LIMIT 1
                        )
                        ELSE NULL
                    END AS secondary_mapped_price
                FROM primary_mapped pm
            )
        $$, _forex_multiplier);

        price_expr_primary := $$
            CASE 
                WHEN offer_type IN ('percent_off', 'extra_amount_off', 'fixed_price', 'upto_x_percent_off') 
                THEN mapped_price 
                ELSE list_price 
            END
        $$;

        price_expr_secondary := 'secondary_mapped_price';
        final_cte := 'secondary_mapped';
        groupby_additions := ', mapped_price, secondary_mapped_price';

    ELSE
        use_cte_logic := '';
        price_expr_primary := $$
            CASE 
                WHEN offer_type IN ('percent_off', 'extra_amount_off', 'fixed_price', 'upto_x_percent_off') 
                THEN raw_price 
                ELSE list_price 
            END
        $$;

        price_expr_secondary := format($$
            CASE 
                WHEN l0_cid = 5 THEN (raw_price * %s)::numeric
                ELSE NULL::numeric 
            END
        $$, _forex_multiplier);

        final_cte := 'base_data';
        groupby_additions := '';
    END IF;

    dyn_sql := format($f$
        WITH promo_products AS (
            SELECT 
                pm.product_id, 
				pm.l0_cid,
				pm.product_name AS product_name,
                pm.l0_name AS brand, 
				pm.l1_name AS division,
                pm.l2_name AS department, 
				pm.l3_name AS class,
				pm.l4_name AS sub_class,
				pm.l5_name AS style,
				pm.l6_name AS customer_choice,
                ROUND(pm.promo_base_price::numeric, 2) AS list_price,
                ROUND(pm.cost::numeric, 2) AS cost
            FROM %1$s pp
            JOIN price_promo.product_master pm USING (product_id)
			where pm.promo_base_price is not null
        ),

        promo_stores AS (
            SELECT store_id
            FROM price_promo.fn_fetch_stores_for_promo(%2$s) ss
            JOIN pricesmart.tb_store_master sm USING (store_id)
        ),

        -- Get inventory data from latest inventory table
        inventory_data AS (
            SELECT 
                li.product_id,
                SUM(li.oh::integer) AS on_hand,
                SUM(li.it::integer) AS in_transit
            FROM price_promo.product_master li
            INNER JOIN promo_products pp ON li.product_id = pp.product_id
            GROUP BY li.product_id
        ),
        
        scenario_metrics AS (
            -- Get metrics from scenarios
            SELECT 
                prs.promo_id,
                sm.scenario_order_id,
                prs.product_id,
                ROUND(SUM(prs.sales_units)::numeric, 1) AS units,
                ROUND(SUM(prs.revenue)::numeric, 0) AS revenue,
                ROUND(SUM(prs.margin)::numeric, 0) AS margin,
                CASE 
                    WHEN SUM(prs.revenue) = 0 THEN 0
                    ELSE ROUND((100.0 * SUM(prs.margin) / SUM(prs.revenue))::numeric, 1)
                END AS margin_pct,

                ROUND(SUM(prs.baseline_sales_units)::numeric, 1) AS baseline_sales_units,
                ROUND(SUM(prs.baseline_revenue)::numeric, 0) AS baseline_revenue,
                ROUND(SUM(prs.baseline_margin)::numeric, 0) AS baseline_margin,
                CASE 
                    WHEN SUM(prs.baseline_revenue) = 0 THEN 0
                    ELSE ROUND((100.0 * SUM(prs.baseline_margin) / SUM(prs.baseline_revenue))::numeric, 1)
                END AS baseline_margin_pct,

                ROUND(SUM(prs.incremental_sales_units)::numeric, 1) AS incremental_sales_units,
                ROUND(SUM(prs.incremental_revenue)::numeric, 0) AS incremental_revenue,
                ROUND(SUM(prs.incremental_margin)::numeric, 0) AS incremental_margin
               
            FROM price_promo.ps_recommended_scenarios prs
            JOIN price_promo.scenario_master sm ON prs.scenario_id = sm.scenario_id
            WHERE prs.scenario_id = ANY(string_to_array('%11$s', ',')::int[])
            GROUP BY prs.promo_id, sm.scenario_order_id, prs.product_id
            
            UNION ALL
            
            -- Get metrics from IA recommendations
            SELECT 
                prip.promo_id,
                0 AS scenario_order_id, -- IA recommendations are always scenario_order_id = 0
                prip.product_id,
                ROUND(SUM(prip.sales_units)::numeric, 1) AS units,
                ROUND(SUM(prip.revenue)::numeric, 0) AS revenue,
                ROUND(SUM(prip.margin)::numeric, 0) AS margin,
                CASE 
                    WHEN SUM(prip.revenue) = 0 THEN 0
                    ELSE ROUND((100.0 * SUM(prip.margin) / SUM(prip.revenue))::numeric, 1)
                END AS margin_pct,

                ROUND(SUM(prip.baseline_sales_units)::numeric, 1) AS baseline_sales_units,
                ROUND(SUM(prip.baseline_revenue)::numeric, 0) AS baseline_revenue,
                ROUND(SUM(prip.baseline_margin)::numeric, 0) AS baseline_margin,
                CASE 
                    WHEN SUM(prip.baseline_revenue) = 0 THEN 0
                    ELSE ROUND((100.0 * SUM(prip.baseline_margin) / SUM(prip.baseline_revenue))::numeric, 1)
                END AS baseline_margin_pct,

                ROUND(SUM(prip.incremental_sales_units)::numeric, 1) AS incremental_sales_units,
                ROUND(SUM(prip.incremental_revenue)::numeric, 0) AS incremental_revenue,
                ROUND(SUM(prip.incremental_margin)::numeric, 0) AS incremental_margin

            FROM price_promo.ps_recommended_ia_projected prip
            WHERE prip.promo_id = %2$s
            GROUP BY prip.promo_id, prip.product_id
        ),
        
        flattened_scenarios AS (
            SELECT psd.promo_id, psd.product_level_id,psd.store_level_id,
                   key::TEXT AS scenario_key, value AS scenario_json
            FROM price_promo.ps_scenario_discounts psd,
                 jsonb_each(psd.scenario_data)
            WHERE psd.promo_id = %2$s

            UNION ALL

            SELECT psd.promo_id, psd.product_level_id,psd.store_level_id,
                   '0' AS scenario_key, psd.ia_recommended_data->'0' AS scenario_json
            FROM price_promo.ps_scenario_discounts psd
            WHERE psd.promo_id = %2$s AND psd.ia_recommended_data IS NOT NULL
        ),

        scenario_expanded AS (
            SELECT
                fs.promo_id, fs.product_level_id,fs.store_level_id,
                (fs.scenario_json->>'scenario_order_id')::INT AS scenario_order_id,
                (fs.scenario_json->>'offer_type')::text AS offer_type,
                (fs.scenario_json->>'offer_x_value')::FLOAT AS offer_x_value,
                (fs.scenario_json->>'offer_y_value')::FLOAT AS offer_y_value,
                (fs.scenario_json->>'offer_z_value')::FLOAT AS offer_z_value,
                (fs.scenario_json->>'offer_x_type')::text AS offer_x_type,
                (fs.scenario_json->>'offer_y_type')::text AS offer_y_type,
                (fs.scenario_json->>'tier_id')::INT AS tier_id,
                fs.scenario_json->'special_offer_data' AS special_offer_data
            FROM flattened_scenarios fs
            where (fs.scenario_json->>'scenario_order_id' is not null 
                   and fs.scenario_json->>'offer_x_value' is not null)
            or scenario_key ='0'
        ),

        scenario_mapping AS (
            SELECT sm.scenario_id, sm.scenario_order_id, sm.promo_id, sm.scenario_name
            FROM price_promo.scenario_master sm
            WHERE sm.promo_id = %2$s
            UNION ALL
            SELECT 0 AS scenario_id, 0 AS scenario_order_id, %2$s AS promo_id, 'IA Recommended' as scenario_name
        ),

        promo_meta AS (
            SELECT promo_id, status, last_approved_scenario_id
            FROM price_promo.promo_master
            WHERE promo_id = %2$s
        ),

        base_data AS (
            SELECT
                se.promo_id, 
				se.product_level_id,
				se.store_level_id,
                se.scenario_order_id, 
				se.offer_type, 
				se.offer_x_value, 
				se.offer_y_value, 
				se.offer_z_value,
                se.offer_x_type, 
				se.offer_y_type, 
				se.tier_id, 
				se.special_offer_data,
                smap.scenario_id, 
				smap.scenario_name,
                CASE 
                    WHEN p.status in (2,4,8) AND p.last_approved_scenario_id = smap.scenario_id 
                    THEN 'Finalized' ELSE 'Not Finalized'
                END::text AS finalized_flag,
				ps.store_id,
                pp.product_id, 
				pp.l0_cid, 
				pp.product_name, 
				pp.brand, 
				pp.division, 
				pp.department, 
				pp.class,
				pp.sub_class,
				pp.style,
				pp.customer_choice,
				pp.list_price, 
				pp.cost, 
                CASE 
                    WHEN se.offer_type IN ('percent_off', 'extra_amount_off', 'fixed_price', 'upto_x_percent_off')
                        THEN se.offer_x_value::text
                    ELSE
                        price_promo.get_offer_description_v2(
                            se.offer_type::text, se.offer_x_value::numeric, se.offer_x_type::text,
                            se.offer_y_value::numeric, se.offer_y_type::text,
                            se.offer_z_value::numeric, se.tier_id::numeric, se.special_offer_data::jsonb
                        )::text
                END AS offer_value,
                CASE se.offer_type
                    WHEN 'percent_off' THEN ROUND((pp.list_price * (1 - se.offer_x_value / 100))::numeric, 2)
                    WHEN 'upto_x_percent_off' THEN ROUND((pp.list_price * (1 - se.offer_x_value / 100))::numeric, 2)
                    WHEN 'extra_amount_off' THEN ROUND((pp.list_price - se.offer_x_value)::numeric, 2)
                    WHEN 'fixed_price' THEN ROUND(se.offer_x_value::numeric, 2)
                    ELSE pp.list_price
                END AS raw_price
            FROM scenario_expanded se
            JOIN scenario_mapping smap ON se.promo_id = smap.promo_id AND se.scenario_order_id = smap.scenario_order_id
            JOIN promo_meta p ON se.promo_id = p.promo_id
            -- Dynamic joins based on discount level flags
            %8$s
            %9$s
        )%3$s

        SELECT distinct
			product_name AS "Product Name",
            brand AS "Brand",
            division AS "Division",
            department AS "Department",
            class AS "Class",
			sub_class AS "Sub Class",
			style AS "Style",
			customer_choice AS "Customer Choice",
            list_price AS "Base Price",
            scenario_name::text AS "Scenario",
            finalized_flag AS "Finalized Flag",
            (CASE offer_type
                WHEN 'percent_off' THEN '%% OFF'
                WHEN 'upto_x_percent_off' THEN 'UP TO %% OFF'
                WHEN 'extra_amount_off' THEN 'AMOUNT OFF'
                WHEN 'fixed_price' THEN 'FIXED PRICE'
				WHEN 'bmsm_transaction_discount' THEN 'TRANSACTION DISCOUNT'
				WHEN 'bmsm_fixed_quantity' THEN 'FIXED QUANTITY'
                ELSE UPPER(REPLACE(offer_type, '_', ' '))
            END)::text AS "Offer Type",
            offer_value AS "Offer Value",
            ROUND(COALESCE(sm.units, 0)::numeric, 1) AS "Units",
            ROUND(COALESCE(sm.revenue, 0)::numeric, 0) AS "Revenue",
            ROUND(COALESCE(sm.margin, 0)::numeric, 0) AS "Margin",
            CASE WHEN sm.margin_pct = 0 and  %4$s = 0 then 0 
            WHEN sm.margin_pct = 0 then ROUND(COALESCE(100 * (%4$s - cost)/ %4$s, 0)::numeric, 1)
            ELSE ROUND(COALESCE(sm.margin_pct, 0)::numeric, 1) END AS "GM%%",

            ROUND(COALESCE(inv.on_hand, 0)::numeric, 0) AS "On Hand",
            ROUND(COALESCE(inv.in_transit, 0)::numeric, 0) AS "In Transit",
            ROUND(COALESCE(sm.baseline_sales_units, 0)::numeric, 1) AS "Baseline Units",
            ROUND(COALESCE(sm.baseline_revenue, 0)::numeric, 0) AS "Baseline Revenue",
            ROUND(COALESCE(sm.baseline_margin, 0)::numeric, 0) AS "Baseline Margin",
            CASE WHEN sm.baseline_margin_pct = 0 and  list_price = 0 then 0 
            WHEN sm.baseline_margin_pct = 0 then ROUND(COALESCE(100 * (list_price - cost)/ list_price, 0)::numeric, 1)
            ELSE ROUND(COALESCE(sm.baseline_margin_pct, 0)::numeric, 1) END AS "Baseline GM%%",

            ROUND(COALESCE(sm.incremental_sales_units, 0)::numeric, 1) AS "Incremental Units",
            ROUND(COALESCE(sm.incremental_revenue, 0)::numeric, 0) AS "Incremental Revenue",
            ROUND(COALESCE(sm.incremental_margin, 0)::numeric, 0) AS "Incremental Margin",
            (CASE WHEN sm.margin_pct = 0 and  %4$s = 0 then 0 
            WHEN sm.margin_pct = 0 then ROUND(COALESCE(100 * (%4$s - cost)/ %4$s, 0)::numeric, 1)
            ELSE ROUND(COALESCE(sm.margin_pct, 0)::numeric, 1) END )
            -
            (CASE WHEN sm.baseline_margin_pct = 0 and  list_price = 0 then 0 
            WHEN sm.baseline_margin_pct = 0 then ROUND(COALESCE(100 * (list_price - cost)/ list_price, 0)::numeric, 1)
            ELSE ROUND(COALESCE(sm.baseline_margin_pct, 0)::numeric, 1)
            END)
            AS "Incremental GM%%"

        FROM %6$s bd
        LEFT JOIN scenario_metrics sm 
        ON bd.product_id = sm.product_id 
        AND bd.scenario_order_id = sm.scenario_order_id
        LEFT JOIN inventory_data inv ON bd.product_id = inv.product_id
        order by 1,2,3,4,5,6,7
        ;
    $f$,
    _promo_product_table,            -- %1$s
    _promo_id,                       -- %2$s
    use_cte_logic,                   -- %3$s
    price_expr_primary,              -- %4$s
    price_expr_secondary,            -- %5$s
    final_cte,                       -- %6$s
    groupby_additions,               -- %7$s
    product_join_sql,                -- %8$s
    store_join_sql,                  -- %9$s
    _start_date,                     -- %10$s
    _scenario_ids_str                -- %11$s
    );

    RAISE NOTICE 'SQL: %', dyn_sql;

    RETURN QUERY EXECUTE dyn_sql;
END;
$function$
;

