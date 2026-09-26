--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:fn_step3_price_file runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for fn_step3_price_file

DROP FUNCTION if exists price_promo_opt.fn_step3_price_file;
CREATE OR REPLACE FUNCTION price_promo_opt.fn_step3_price_file(_promo_id integer, _use_applicable_price_points boolean DEFAULT false)
 RETURNS TABLE(brand character varying, sku character varying, list_price numeric, scenario character varying, finalized_flag character varying, offer_type character varying, offer_value character varying, primary_currency character varying, primary_currency_value numeric, secondary_currency character varying, secondary_currency_value numeric, store_list character varying)
 LANGUAGE plpgsql
AS $function$
DECLARE
    dyn_sql TEXT;
    group_by_extension TEXT;
    _promo_product_table TEXT := quote_ident('price_promo') || '.' || quote_ident('promo_product_' || _promo_id);
BEGIN
    group_by_extension := CASE WHEN _use_applicable_price_points THEN ', mapped_price' ELSE '' END;

    dyn_sql := format($f$
        WITH promo_products AS (
            SELECT pm.product_id, pm.product_name::varchar AS sku, pm.l0_name::varchar AS brand, pm.l0_id, ROUND(pm.current_price::numeric, 2) AS list_price
            FROM %1$s pp
            JOIN price_promo.product_master pm USING (product_id)
        ),
        promo_stores AS (
            SELECT sm.store_id
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
                fs.promo_id,
                fs.product_level_id,
                fs.store_level_id,
                fs.customer_level_id,
                (fs.scenario_json->>'scenario_order_id')::INT AS scenario_order_id,
                COALESCE(NULLIF(fs.scenario_json->>'scenario_name', ''), 'IA Recommended')::varchar AS scenario_name,
                (fs.scenario_json->>'offer_type')::varchar AS offer_type,
                (fs.scenario_json->>'offer_x_value')::FLOAT AS offer_x_value,
                (fs.scenario_json->>'offer_y_value')::FLOAT AS offer_y_value,
                (fs.scenario_json->>'offer_z_value')::FLOAT AS offer_z_value,
                (fs.scenario_json->>'offer_x_type')::varchar AS offer_x_type,
                (fs.scenario_json->>'offer_y_type')::varchar AS offer_y_type,
                (fs.scenario_json->>'tier_id')::INT AS tier_id,
                fs.scenario_json->'special_offer_data' AS special_offer_data
            FROM flattened_scenarios fs
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
                se.promo_id,
                se.product_level_id,
                se.store_level_id,
                se.customer_level_id,
                smap.scenario_id,
                se.scenario_order_id,
                se.scenario_name,
                se.offer_type,
                se.offer_x_value,
                se.offer_y_value,
                se.offer_z_value,
                se.offer_x_type,
                se.offer_y_type,
                se.tier_id,
                se.special_offer_data,
                CASE 
                    WHEN p.status = 4 AND p.last_approved_scenario_id = smap.scenario_id THEN 'Finalized'
                    ELSE 'Not Finalized'
                END::varchar AS finalized_flag,
                dlp.product_id,
                dls.store_id,
                pp.brand,
                pp.l0_id,
                pp.sku,
                pp.list_price,
                CASE 
                    WHEN se.offer_type IN ('percent_off', 'extra_amount_off', 'fixed_price')
                        THEN se.offer_x_value::varchar
                    ELSE
                        price_promo.get_offer_description_v2(
                            se.offer_type::text,
                            se.offer_x_value::numeric,
                            se.offer_x_type::text,
                            se.offer_y_value::numeric,
                            se.offer_y_type::text,
                            se.offer_z_value::numeric,
                            se.tier_id::numeric,
                            se.special_offer_data::jsonb
                        )::varchar
                END AS offer_value,
                CASE se.offer_type
                    WHEN 'percent_off' THEN ROUND((pp.list_price * (1 - se.offer_x_value / 100))::numeric, 2)
                    WHEN 'extra_amount_off' THEN ROUND((pp.list_price - se.offer_x_value)::numeric, 2)
                    WHEN 'fixed_price' THEN ROUND(se.offer_x_value::numeric, 2)
                    ELSE pp.list_price
                END AS raw_price
            FROM scenario_expanded se
            JOIN scenario_mapping smap ON se.promo_id = smap.promo_id AND se.scenario_order_id = smap.scenario_order_id
            JOIN promo_meta p ON se.promo_id = p.promo_id
            JOIN price_promo.tb_discount_level_products dlp USING (product_level_id)
            JOIN price_promo.tb_discount_level_stores dls USING (store_level_id)
            JOIN promo_products pp ON dlp.product_id = pp.product_id
            JOIN promo_stores ps ON dls.store_id = ps.store_id
        )
        %3$s
        SELECT
            brand,
            sku,
            list_price,
            scenario_name AS scenario,
            finalized_flag,
            offer_type,
            offer_value,
            'USD'::varchar AS primary_currency,
            %4$s AS primary_currency_value,
            NULL::varchar AS secondary_currency,
            NULL::numeric AS secondary_currency_value,
            STRING_AGG(DISTINCT store_id::TEXT, ',')::varchar AS store_list
        FROM %5$s
        GROUP BY
            brand, sku, list_price, scenario_name, finalized_flag, offer_type, offer_value,
            raw_price, list_price %6$s
    $f$,
    _promo_product_table,
    _promo_id,
    CASE WHEN _use_applicable_price_points THEN
        ', price_mapped AS (
            SELECT bd.*, app.price AS mapped_price
            FROM base_data bd
            LEFT JOIN LATERAL (
                SELECT price
                FROM price_promo.tb_acceptable_price_points app
                WHERE app.l0_id = bd.l0_id
                ORDER BY ABS(app.price - bd.raw_price)
                LIMIT 1
            ) app ON TRUE
        )'
    ELSE '' END,
    CASE 
        WHEN _use_applicable_price_points THEN 
            'CASE 
                WHEN offer_type IN (''percent_off'', ''extra_amount_off'', ''fixed_price'') 
                    THEN mapped_price 
                ELSE list_price 
             END'
        ELSE 
            'CASE 
                WHEN offer_type IN (''percent_off'', ''extra_amount_off'', ''fixed_price'') 
                    THEN raw_price 
                ELSE list_price 
             END'
    END,
    CASE WHEN _use_applicable_price_points THEN 'price_mapped' ELSE 'base_data' END,
    group_by_extension
    );

    RAISE NOTICE 'Final SQL: %', dyn_sql;
    RETURN QUERY EXECUTE dyn_sql;
END;
$function$



;