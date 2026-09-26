--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:fn_step3_price_file runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for fn_step3_price_file

DROP FUNCTION if exists price_promo_opt.fn_step3_price_file;
CREATE OR REPLACE FUNCTION price_promo_opt.fn_step3_price_file(_promo_id integer, _use_applicable_price_points boolean DEFAULT true)
 RETURNS TABLE("Brand" text, "Department" text, "Sub Department" text, "Class" text, "Family" text, "Parent" text, "SKU" text, "BrandSKU" text, "SKU Description" text, "List Price" numeric, "Scenario" text, "Finalized Flag" text, "Offer Type" text, "Offer Value" text, "Primary Currency" text, "Primary Currency Value" numeric, "Secondary Currency" text, "Secondary Currency Value" numeric)
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
                pm.product_id, pm.l0_cid, pm.currency AS primary_currency,
                pm.l0_name AS brand, pm.l1_name AS department,
                pm.l2_name AS sub_department, pm.l3_name AS class,
                pm.l4_name AS family, pm.l5_name AS parent,
                pm.l6_name AS sku, pm.product_name AS sku_description,
                pm.brandsku AS brandsku,
                ROUND(pm.msrp_with_vat::numeric, 2) AS list_price
            FROM %1$s pp
            JOIN price_promo.product_master pm USING (product_id)
			where pm.msrp_with_vat is not null
        ),
        promo_stores AS (
            SELECT store_id
            FROM price_promo.fn_fetch_stores_for_promo(%2$s) ss
            JOIN global.tb_store_master sm USING (store_id)
        ),
        flattened_scenarios AS (
            SELECT psd.promo_id, psd.product_level_id, psd.store_level_id, psd.customer_level_id,
                   key::TEXT AS scenario_key, value AS scenario_json
            FROM price_promo.ps_scenario_discounts psd,
                 jsonb_each(psd.scenario_data)
            WHERE psd.promo_id = %2$s

            UNION ALL

            SELECT psd.promo_id, psd.product_level_id, psd.store_level_id, psd.customer_level_id,
                   '0' AS scenario_key, psd.ia_recommended_data->'0' AS scenario_json
            FROM price_promo.ps_scenario_discounts psd
            WHERE psd.promo_id = %2$s AND psd.ia_recommended_data IS NOT NULL
        ),
        scenario_expanded AS (
            SELECT
                fs.promo_id, fs.product_level_id, fs.store_level_id, fs.customer_level_id,
                (fs.scenario_json->>'scenario_order_id')::INT AS scenario_order_id,
                COALESCE(NULLIF(fs.scenario_json->>'scenario_name', ''), 'IA Recommended')::text AS scenario_name,
                (fs.scenario_json->>'offer_type')::text AS offer_type,
                (fs.scenario_json->>'offer_x_value')::FLOAT AS offer_x_value,
                (fs.scenario_json->>'offer_y_value')::FLOAT AS offer_y_value,
                (fs.scenario_json->>'offer_z_value')::FLOAT AS offer_z_value,
                (fs.scenario_json->>'offer_x_type')::text AS offer_x_type,
                (fs.scenario_json->>'offer_y_type')::text AS offer_y_type,
                (fs.scenario_json->>'tier_id')::INT AS tier_id,
                fs.scenario_json->'special_offer_data' AS special_offer_data
            FROM flattened_scenarios fs
            where fs.scenario_json->>'scenario_name' is not null or scenario_key ='0'
        ),
        scenario_mapping AS (
            SELECT sm.scenario_id, sm.scenario_order_id, sm.promo_id
            FROM price_promo.scenario_master sm
            WHERE sm.promo_id = %2$s
            UNION ALL
            SELECT 0 AS scenario_id, 0 AS scenario_order_id, %2$s AS promo_id
        ),
        promo_meta AS (
            SELECT promo_id, status, last_approved_scenario_id
            FROM price_promo.promo_master
            WHERE promo_id = %2$s
        ),

        base_data AS (
            SELECT
                se.promo_id, se.product_level_id, se.store_level_id, se.customer_level_id,
                smap.scenario_id, se.scenario_order_id, se.scenario_name,
                se.offer_type, se.offer_x_value, se.offer_y_value, se.offer_z_value,
                se.offer_x_type, se.offer_y_type, se.tier_id, se.special_offer_data,
                CASE 
                    WHEN p.status in (4,8) AND p.last_approved_scenario_id = smap.scenario_id 
                    THEN 'Finalized' ELSE 'Not Finalized'
                END::text AS finalized_flag,
                pp.product_id, ps.store_id,
                pp.brand, pp.department, pp.sub_department, pp.class, pp.family,
                pp.parent, pp.sku, pp.sku_description, pp.list_price,
                pp.primary_currency, pp.l0_cid,pp.brandsku,
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

        SELECT
            brand AS "Brand",
            department AS "Department",
            sub_department AS "Sub Department",
            class AS "Class",
            family AS "Family",
            parent AS "Parent",
            sku AS "SKU",
            brandsku AS "BrandSKU",
            sku_description AS "SKU Description",
            list_price AS "List Price",
            scenario_name AS "Scenario",
            finalized_flag AS "Finalized Flag",
            (CASE offer_type
                WHEN 'percent_off' THEN '%% OFF'
                WHEN 'upto_x_percent_off' THEN 'UP TO %% OFF'
                WHEN 'extra_amount_off' THEN 'AMOUNT OFF'
                WHEN 'fixed_price' THEN 'FIXED PRICE'
                ELSE UPPER(REPLACE(offer_type, '_', ' '))
            END)::text AS "Offer Type",
            offer_value AS "Offer Value",
            primary_currency AS "Primary Currency",
            %4$s AS "Primary Currency Value",
            (CASE WHEN l0_cid = 5 THEN 'EUR' ELSE NULL END)::text AS "Secondary Currency",
            %5$s AS "Secondary Currency Value"
        FROM %6$s
        GROUP BY
            brand, department, sub_department, class, family, parent, sku,
            sku_description, brandsku, list_price, scenario_name, finalized_flag,
            offer_type, offer_value, raw_price, primary_currency, l0_cid%7$s;
    $f$,
    _promo_product_table,            -- %1$s
    _promo_id,                       -- %2$s
    use_cte_logic,                   -- %3$s
    price_expr_primary,              -- %4$s
    price_expr_secondary,           -- %5$s
    final_cte,                       -- %6$s
    groupby_additions,               -- %7$s
    product_join_sql,                -- %8$s
    store_join_sql                   -- %9$s
    );

    
    RAISE NOTICE 'SQL: %', dyn_sql;

    RETURN QUERY EXECUTE dyn_sql;
END;
$function$



;