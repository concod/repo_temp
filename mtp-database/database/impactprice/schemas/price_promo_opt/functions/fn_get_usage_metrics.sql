--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:fn_get_usage_metrics runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for fn_get_usage_metrics

DROP FUNCTION if exists price_promo_opt.fn_get_usage_metrics;
CREATE OR REPLACE FUNCTION price_promo_opt.fn_get_usage_metrics(_usage_metric text, _frequency text)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    query varchar;
	result int4;
BEGIN

	query := format('
		with main_data AS (
		SELECT 
		    -- Core Promo Master Fields
		    pm.promo_id,
		    pm.promo_code,
		    pm.event_id,
		    pm.name AS promo_name,
		    pm.start_date,
		    pm.end_date,
		    pm.step_count,
		    pm.products_count,
		    pm.stores_count,
		    pm.style_id_count,
		    pm.is_hero_promo,
		    pm.is_lock_promo,
		    pm.marketing_channel,
		    pm.copied_from,
		    pm.last_approved_scenario_id,
		    pm.upload_used,
		    pm.is_overridden_scenario,
		    pm.recommendation_type_id,
		    pm.copied_at,
		    pm.last_exmd_synced_time,
		    pm.is_overridden_scenario_finalized,
		    pm.has_stacked_offers,
		    pm.total_inventory,
		    pm.currency_id,
		    pm.created_by AS promo_created_by,
		    pm.updated_by AS promo_updated_by,
		    pm.created_at AS promo_created_at,
		    pm.updated_at AS promo_updated_at,
		    pm.is_deleted,
		    
		    -- Status Configuration
		    psc.status_name AS promo_status_name,
		    psc.status_type AS promo_status_type,
		    psc.display_order AS status_display_order,
		    
		    -- Product Selection Type Configuration
		    pstc.product_selection_type,
		    pstc.product_selection_sub_type,
		    
		    -- Store Selection Type Configuration
		    sstc.store_selection_type,
		    sstc.store_selection_sub_type,
		    
		    -- Customer Type Configuration
		    ctc.customer_type,
		    
		    -- Offer Distribution Channel Configuration
		    odcc.channel AS offer_distribution_channel,
		    
		    -- PS Rules (Pricing Rules)
		    pr.rule_id,
		    pr.priority_number,
		    pr.discount_level,
		    pr.discount_type_id,
		    pr.discount_type,
		    pr.min_discount,
		    pr.max_discount,
		    
		    pr.gross_margin_target,
		    pr.gross_margin_priority,
		    pr.revenue_target,
		    pr.revenue_priority,
		    pr.units_target,
		    pr.units_priority,
		    pr.gross_margin_percent_target,
		    pr.gross_margin_percent_priority,
		    pr.opt_discount_type_id,
		    pr.min_eff_percent,
		    pr.max_eff_percent,
		    pr.discount_segment,
		    pr.competitive_price,
		    pr.margin_below,
		    pr.vf_fixed_amount,
		    pr.vf_per_unit,
		    pr.vf_type,
		    pr.product_discount_level,
		    pr.store_discount_level,
		    pr.customer_discount_level,
		    pr.maximization_parameter,
		    pr.baseline_revenue,
		    pr.baseline_margin,
		    pr.baseline_units,
		    pr.baseline_gm_percent,
		    pr.ly_revenue,
		    pr.ly_margin,
		    pr.ly_units,
		    pr.ly_gm_percent,
		    pr.targets_edited,
		    pr.min_upto_percent,
		    pr.max_upto_percent,
		    -- pr.products_on_max_upto_percent,
		
		
		    pr.updated_at AS rule_updated_at,
		 
		    dlc.discount_level_value AS product_discounting_hierarchy,
		    dlc1.discount_level_value AS store_discounting_hierarchy,
		
		    -- Calculated Fields for Reporting
		    CASE 
		        WHEN pm.end_date < CURRENT_DATE THEN ''Past''
		        WHEN pm.start_date > CURRENT_DATE THEN ''Future''
		        WHEN pm.start_date <= CURRENT_DATE AND pm.end_date >= CURRENT_DATE THEN ''Active''
		        ELSE ''Unknown''
		    END AS promo_period_status,
		
		    (pm.end_date - pm.start_date + 1) AS promo_duration_days,
		
		    psc.status_name AS promo_status_description,
		  
		    pfa.effective_discount,
		    psd.is_simulated,
		    psd.is_optimized,
		    tfcm.fiscal_week,
		    tfcm.fiscal_year,
		    tfcm.fiscal_month,
		    -- No of Promos created each fiscal_week
		 
		    -- Current timestamp for reporting
		    CURRENT_TIMESTAMP AS report_generated_at,

			-- Finalized Data
			prfa.simulation_incremental_revenue,
			prfa.simulation_incremental_margin,
			prfa.simulation_incremental_sales_units,
			prfa.simulation_effective_discount,

			-- Actualized Data
			praa.actualization_incremental_revenue,
			praa.actualization_incremental_margin,
			praa.actualization_incremental_sales_units,
			praa.actualization_effective_discount
		
		FROM price_promo.promo_master pm
		    
		  -- Join with PS Rules (1:1 relationship)
		    LEFT JOIN (
		   SELECT
		    t.*,
		    (SELECT MAX(x) FROM unnest(product_discount_level) AS x) AS product_discount_level_max,
		    (SELECT MAX(x) FROM unnest(store_discount_level)   AS x) AS store_discount_level_max
		FROM price_promo.ps_rules t
		    ) pr ON pm.promo_id = pr.promo_id
		    
		  -- Join with Status Configuration
		    LEFT JOIN price_promo.promo_status_config psc ON pm.status = psc.status_id
		    
		  -- Join with Product Selection Type Configuration
		    LEFT JOIN price_promo.product_selection_type_config pstc ON pm.product_selection_type = pstc.id
		    
		  -- Join with Store Selection Type Configuration
		    LEFT JOIN price_promo.store_selection_type_config sstc ON pm.store_selection_type = sstc.id
		    
		  -- Join with Customer Type Configuration
		    LEFT JOIN price_promo.tb_customer_type_config ctc ON pm.customer_type = ctc.id
		    
		  -- Join with Offer Distribution Channel Configuration
		    LEFT JOIN price_promo.tb_offer_distributor_channel_config odcc ON pm.offer_distribution_channel = odcc.id
		
		  -- Join with Discount Level Configuration (for the main discount level FROM ps_rules)
		    LEFT JOIN  (SELECT * FROM price_promo.discount_level_config WHERE category = ''product'') dlc ON pr.product_discount_level_max = dlc.discount_level_id 
		  -- Join with Discount Level Configuration (for the main discount level FROM ps_rules)
		    LEFT JOIN  (SELECT * FROM price_promo.discount_level_config WHERE category = ''store'') dlc1 ON pr.store_discount_level_max = dlc1.discount_level_id 
			LEFT JOIN (SELECT distinct promo_id, CASE WHEN psd.scenario_data IS NOT NULL THEN 1 ELSE 0 END AS is_simulated,
		    CASE WHEN psd.ia_recommended_data IS NOT NULL THEN 1 ELSE 0 END AS is_optimized
			FROM price_promo.ps_scenario_discounts psd
			) psd ON pm.promo_id = psd.promo_id
		    LEFT JOIN (SELECT promo_id, max(effective_discount) effective_discount FROM price_promo.ps_recommended_finalized_agg group by promo_id) pfa ON pm.promo_id = pfa.promo_id
		    LEFT JOIN pricesmart.tb_fiscal_date_mapping tfcm ON pm.created_at::date = tfcm.date_id
			LEFT JOIN (SELECT promo_id, SUM(incremental_revenue) AS simulation_incremental_revenue, SUM(incremental_margin) AS simulation_incremental_margin, SUM(incremental_sales_units) AS simulation_incremental_sales_units, MAX(effective_discount) AS simulation_effective_discount
			FROM price_promo.ps_recommended_finalized_agg
			GROUP BY promo_id) prfa ON pm.promo_id = prfa.promo_id
			LEFT JOIN (SELECT promo_id, SUM(incremental_revenue) AS actualization_incremental_revenue, SUM(incremental_margin) AS actualization_incremental_margin, SUM(incremental_sales_units) AS actualization_incremental_sales_units, MAX(effective_discount) AS actualization_effective_discount
			FROM price_promo.ps_recommended_actuals_agg
			GROUP BY promo_id) praa ON pm.promo_id = praa.promo_id
		ORDER BY pm.promo_id DESC)
		
		SELECT %s
		FROM main_data
		%s
	',
	CASE
	WHEN _usage_metric = 'promos_lm' OR _usage_metric = 'promos_lw' OR _usage_metric = 'total_promos'
	THEN 'COUNT(distinct promo_id)'
	WHEN _usage_metric = 'active_users' OR _usage_metric = 'unique_users'
	THEN 'COUNT(distinct promo_created_by)'
	WHEN _usage_metric = 'sim_inc_rev'
	THEN 'COUNT(simulation_incremental_revenue < 0)'
	WHEN _usage_metric = 'sim_inc_margin'
	THEN 'COUNT(simulation_incremental_margin < 0)'
	WHEN _usage_metric = 'act_inc_rev'
	THEN 'COUNT(actualization_incremental_revenue < 0)'
	WHEN _usage_metric = 'act_inc_margin'
	THEN 'COUNT(actualization_incremental_margin < 0)'
	END,
	CASE
	WHEN _frequency = 'monthly'
	THEN 'WHERE promo_created_at::date between (date_trunc(''month'', current_date)) and (date_trunc(''month'', current_date) + interval ''1 month - 1 day'');'
	WHEN _frequency = 'weekly'
	THEN 'WHERE promo_created_at between (current_date - 6) and (current_date);'
	ELSE ';'
	END
	);

	EXECUTE query INTO result;

    RETURN result;

END;
$function$
;

