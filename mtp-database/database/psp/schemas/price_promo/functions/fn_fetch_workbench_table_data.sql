--liquibase formatted sql
--changeset harsh.singh@impactanalytics.co:fn_fetch_workbench_table_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial_function_create for fn_fetch_workbench_table_data

DROP FUNCTION if exists price_promo.fn_fetch_workbench_table_data;

CREATE OR REPLACE FUNCTION price_promo.fn_fetch_workbench_table_data(request_payload jsonb, p_user_id integer)
 RETURNS TABLE(
	promo_id integer,
	promo_name text,
	start_date date,
	end_date date,
	event_id integer,
	event_name text,
	is_locked boolean,
	created_by text,
	user_id integer,
	offer_comment text,
	status_id integer,
	status text,
	review_status text,
	step_count integer,
	products_count integer,
	stores_count integer,
	product_selection_type_id integer,
	product_selection_type text,
	store_selection_type_id integer,
	store_selection_type text,
	exclusion_selection_type_id integer,
	exclusion_selection_type text,
	customer_type_id integer,
	customer_type text,
	offer_distribution_channel_id integer,
	offer_distribution_channel text,
	last_approved_scenario_id integer,
	recommendation_type_id integer,
	recommendation_type text,
	is_under_processing smallint,
	is_auto_resimulated smallint,
	is_overridden integer,
	override_comment text,
	override_reason text,
	currency_id integer,
	currency_symbol text,
	currency_name text,
	discount_level_id integer,
	discount_level text,
	discount_type text,
	target_sales_units numeric,
	target_revenue numeric,
	target_margin numeric,
	performance text,
	finalized_margin numeric,
	finalized_revenue numeric,
	finalized_discount text,
	finalized_promo_spend numeric,
	finalized_sales_units numeric,
	finalized_margin_percent numeric,
	finalized_contribution_margin numeric,
	finalized_contribution_revenue numeric,
	finalized_contribution_margin_percent numeric,
	ia_recc_discount text,
	actualized_contribution_margin numeric,
	actualized_contribution_margin_percent numeric,
	finalized_baseline_margin numeric,
	finalized_baseline_revenue numeric,
	finalized_baseline_sales_units numeric,
	original_margin numeric,
	original_revenue numeric,
	original_discount text,
	original_promo_spend numeric,
	original_sales_units numeric,
	original_margin_percent numeric,
	original_contribution_margin numeric,
	original_contribution_revenue numeric,
	original_contribution_margin_percent numeric,
	finalized_stack_baseline_revenue numeric,
	finalized_stack_baseline_sales_units numeric,
	finalized_stack_margin numeric,
	finalized_stack_revenue numeric,
	finalized_stack_promo_spend numeric,
	finalized_stack_sales_units numeric,
	finalized_stack_margin_percent numeric,
	finalized_stack_contribution_margin numeric,
	finalized_stack_contribution_revenue numeric,
	finalized_stack_contribution_margin_percent numeric,
	finalized_stack_baseline_margin numeric,
	original_stack_margin numeric,
	original_stack_revenue numeric,
	original_stack_promo_spend numeric,
	original_stack_sales_units numeric,
	original_stack_margin_percent numeric,
	original_stack_contribution_margin numeric,
	original_stack_contribution_revenue numeric,
	original_stack_contribution_margin_percent numeric,
	finalized_total_inventory integer,
	finalized_st_percent numeric,
	finalized_stack_st_percent numeric,
	actualized_st_percent numeric,
	vendor_portal_status_id integer,
	vendor_created_by text,
	vendor_created_by_name text,
	vendor_portal_status text,
	created_at date,
	updated_at date,
	event_attributes jsonb,
	submission_due_date date
)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    where_str text;
    filtered_promo_cte_query text;
	strict_date_check text;
	_query text;
	is_vendor_portal_request boolean;
BEGIN

	-- Extract is_vendor_portal_request from request_payload, default to false
	is_vendor_portal_request := COALESCE((request_payload->>'is_vendor_portal_request')::boolean, false);

	
	strict_date_check := 
		format(
            CASE 
                WHEN request_payload->>'show_partially_overlapping_events' = 'true' AND
					request_payload->>'metrics_display_mode' = 'selected_date_range'
				THEN 
                    'WHERE original.recommendation_date <= TO_DATE(%L, ''YYYY-MM-DD'') 
                     AND original.recommendation_date >= TO_DATE(%L, ''YYYY-MM-DD'')'
                ELSE 
                    ''
            END,
            request_payload->>'end_date', request_payload->>'start_date'
        );

    -- If promo_ids or event_ids are present, apply filter logic
    IF (request_payload->>'promo_ids' IS NOT NULL 
	    AND jsonb_array_length(request_payload->'promo_ids') > 0)
    THEN
        
		where_str := format('WHERE promo_id IN (%s)', 
                    array_to_string(ARRAY(SELECT jsonb_array_elements_text(request_payload->'promo_ids')), ','));
        
        -- Add vendor portal filtering as a separate clause
        where_str := where_str || format(' AND pm.is_vendor_created_promo = %L',
                                 is_vendor_portal_request);  -- becomes 't' or 'f'
	


        _query := format(
            'WITH promo_master_filtered_cte AS (
		        SELECT
		            pm.promo_id,
		            pm.event_id, 
		            pm.name AS promo_name,
		            pm.start_date,
		            pm.end_date,
		            pm.created_by,
		            pm.status AS status_id,
		            pm.step_count,
		            pm.offer_comment,
		            pm.products_count,
		            pm.stores_count,
		            pm.product_selection_type AS product_selection_type_id,
		            pm.exclusion_selection_type as exclusion_selection_type_id,
		            pm.store_selection_type AS store_selection_type_id,
		            pm.customer_type AS customer_type_id,
		            pm.offer_distribution_channel AS offer_distribution_channel_id,
		            pm.last_approved_scenario_id,
		            pm.recommendation_type_id,
		            pm.is_under_processing,
		            pm.is_auto_resimulated,
		            pm.is_overridden_scenario_finalized,
		            pm.vendor_portal_status as vendor_portal_status_id,
		            pm.vendor_created_by,
					pm.review_status,
					pm.created_at,
					pm.updated_at
		        FROM
		            price_promo.promo_master pm
		        %1$s
		    ),
			target_currency_cte AS (
			    SELECT 
					fn_get_target_currency_id as target_currency_id  
				from 
					price_promo.fn_get_target_currency_id(
						(
							SELECT array_agg(DISTINCT currency_id) as source_currency_id
							FROM price_promo.ps_recommended_scenarios_agg 
							WHERE promo_id IN (
								SELECT promo_id FROM price_promo.promo_master 
								where event_id in (select event_id from promo_master_filtered_cte)
							)
						),
						%3$L::integer
				)
			),
		    promo_master_details_cte AS (
		        SELECT
		            pmfc.promo_id,
		            pmfc.promo_name,
		            pmfc.start_date,
		            pmfc.end_date,
		            em.name as event_name,
		            em.event_id,
		            em.is_locked,
		            pmfc.created_by,
		            pmfc.status_id,
		            STRING_AGG(psc.status_name::text, '', '') AS status,
					MAX(psrc.review_status)::text AS review_status,
		            pmfc.step_count,
		            pmfc.offer_comment,
		            pmfc.products_count,
		            pmfc.stores_count,
		            pmfc.product_selection_type_id,
		            STRING_AGG(
		                CASE
		                    WHEN pstc.product_selection_sub_type::text IS NOT NULL THEN CONCAT(pstc.product_selection_type::text, ''-'', pstc.product_selection_sub_type::text)
		                    ELSE pstc.product_selection_type::text
		                END,
		                '', ''
		            ) AS product_selection_type,
		            pmfc.store_selection_type_id,
		            STRING_AGG(
		                CASE
		                    WHEN sstc.store_selection_sub_type::text IS NOT NULL THEN CONCAT(sstc.store_selection_type::text, ''-'', sstc.store_selection_sub_type::text)
		                    ELSE sstc.store_selection_type::text
		                END,
		                '', ''
		            ) AS store_selection_type,
		            pmfc.exclusion_selection_type_id, 
		            case 
		            	when exclusion_selection_type_id = 1 then ''hierarchy based exclusion ''
		            	when exclusion_selection_type_id = 2 then ''product based exclusion ''
		            	when exclusion_selection_type_id = 3 then ''product group based exclusion ''
		            	when exclusion_selection_type_id = 4 then ''file upload based exclusion ''
		            end as exclusion_selection_type,
		            pmfc.customer_type_id,
		            STRING_AGG(tctc.customer_type::text, '', '') AS customer_type,
		            pmfc.offer_distribution_channel_id,
		            STRING_AGG(todcc.channel::text, '', '') AS offer_distribution_channel,
		            pmfc.last_approved_scenario_id,
		            pmfc.recommendation_type_id,
		            STRING_AGG(tasm.name, '', '') AS recommendation_type,
		            pmfc.is_under_processing,
		            pmfc.is_auto_resimulated,
		            pmfc.is_overridden_scenario_finalized,
		            pmfc.vendor_portal_status_id,
		            pmfc.vendor_created_by,
		            pvpsc.status_name as vendor_portal_status,
					vum.name as vendor_created_by_name,
					pmfc.created_at,
					pmfc.updated_at
		        FROM
		            promo_master_filtered_cte pmfc
		        left join 
		            price_promo.event_master em on pmfc.event_id = em.event_id
		        LEFT JOIN
		            price_promo.promo_status_config psc ON pmfc.status_id = psc.status_id
		        LEFT JOIN
		            price_promo.product_selection_type_config pstc ON pmfc.product_selection_type_id = pstc.id
		        LEFT JOIN
		            price_promo.store_selection_type_config sstc ON pmfc.store_selection_type_id = sstc.id
		        LEFT JOIN
		            price_promo.tb_customer_type_config tctc ON pmfc.customer_type_id = tctc.id
		        LEFT JOIN
		            price_promo.tb_offer_distributor_channel_config todcc ON pmfc.offer_distribution_channel_id = todcc.id
		        LEFT JOIN 
		            metaschema.tb_app_sub_master tasm ON pmfc.recommendation_type_id = tasm.id
		        LEFT JOIN
		            price_promo.promo_vendor_portal_status_config pvpsc ON pmfc.vendor_portal_status_id = pvpsc.status_id
				LEFT JOIN 
					price_promo.promo_status_review_config psrc ON psrc.id = pmfc.review_status
				LEFT JOIN 
                    global.user_master vum ON pmfc.vendor_created_by = vum.user_code
		        GROUP BY
		            pmfc.promo_id, pmfc.promo_name, pmfc.start_date, pmfc.end_date, em.name, em.event_id, em.is_locked, pmfc.created_by, pmfc.status_id, pmfc.review_status, pmfc.step_count,
		            pmfc.offer_comment, pmfc.products_count, pmfc.stores_count, pmfc.product_selection_type_id, pmfc.store_selection_type_id, pmfc.exclusion_selection_type_id,
		            pmfc.customer_type_id, pmfc.offer_distribution_channel_id, pmfc.last_approved_scenario_id,
		            pmfc.recommendation_type_id, pmfc.is_under_processing, pmfc.is_auto_resimulated, pmfc.is_overridden_scenario_finalized,
		            pmfc.vendor_portal_status_id,
		            pmfc.vendor_created_by,
		            pvpsc.status_name,
					vum.name,
					pmfc.created_at,
					pmfc.updated_at
		    ),
		    promo_rules_cte AS (
		        SELECT
		            pr.promo_id,
		            max(pr.discount_level) AS discount_level_id,
		            string_agg(dlc.discount_level_value, '','') AS discount_level,
		            max(pr.discount_type) as discount_type,
		            max(tasm.display_name) as display_discount_type,
		            max(pr.units_target) as sales_units_target,
		            max(pr.revenue_target) as revenue_target,
		            max(pr.gross_margin_target) as margin_target
		        FROM
		            price_promo.ps_rules pr
		        LEFT JOIN
		            price_promo.discount_level_config dlc ON dlc.discount_level_id = any(pr.product_discount_level)
		        LEFT JOIN
		            metaschema.tb_app_sub_master tasm ON pr.discount_type_id = tasm.id
		        WHERE
		            pr.promo_id IN (SELECT DISTINCT promo_id FROM promo_master_filtered_cte)
					and dlc.category = ''product''
                group by pr.promo_id
		    ),
		    finalized_scenarios_cte AS (
		        SELECT 
		            fep.promo_id,
		            pof.is_default,
					pm.total_inventory
		        FROM 
		            promo_master_filtered_cte fep
		        LEFT JOIN 
		            price_promo.promo_master pm ON fep.promo_id = pm.promo_id
		        LEFT JOIN 
		            price_promo.tb_promo_override_forecast pof ON fep.promo_id = pof.promo_id AND coalesce(pm.last_approved_scenario_id,0) = pof.scenario_id
		    ),
		    original_cte AS (
		        SELECT
		            fe.promo_id,
		            ROUND(CASE WHEN coalesce(sfsc.is_default, false) THEN SUM(sales_units) ELSE NULL END::DECIMAL, 2) AS original_sales_units,
		            ROUND(CASE WHEN coalesce(sfsc.is_default, false) THEN SUM(revenue * pfr.planned_conversion_multiplier) ELSE NULL END::DECIMAL, 2) AS original_revenue,
		            ROUND(CASE WHEN coalesce(sfsc.is_default, false) THEN SUM(margin * pfr.planned_conversion_multiplier) ELSE NULL END::DECIMAL, 2) AS original_margin,
		            ROUND(CASE WHEN coalesce(sfsc.is_default, false) THEN SUM(promo_spend * pfr.planned_conversion_multiplier) ELSE NULL END::DECIMAL, 2) AS original_promo_spend,
		            ROUND((CASE WHEN coalesce(sfsc.is_default, false) THEN (SUM(margin) * 100 / NULLIF(SUM(revenue), 0)) ELSE NULL END)::NUMERIC, 2) AS original_margin_percent,
		            ROUND(CASE WHEN coalesce(sfsc.is_default, false) THEN SUM(contribution_revenue * pfr.planned_conversion_multiplier) ELSE NULL END::DECIMAL, 2) AS original_contribution_revenue,
		            ROUND(CASE WHEN coalesce(sfsc.is_default, false) THEN SUM(contribution_margin * pfr.planned_conversion_multiplier) ELSE NULL END::DECIMAL, 2) AS original_contribution_margin,
		            ROUND((CASE WHEN coalesce(sfsc.is_default, false) THEN (SUM(contribution_margin) * 100 / NULLIF(SUM(contribution_revenue), 0)) ELSE NULL END)::NUMERIC, 2) AS original_contribution_margin_percent,
		            CASE WHEN coalesce(sfsc.is_default, false) THEN MIN(offer_type_combined_display_name) ELSE NULL END AS original_discount,
		            ROUND((CASE WHEN coalesce(sfsc.is_default, false) THEN (SUM(incremental_margin) / NULLIF(ABS(SUM(baseline_margin)), 0)) ELSE NULL END)::DECIMAL * 100::DECIMAL, 2) AS original_performance
		        FROM
		            promo_master_filtered_cte fe 
		        INNER JOIN
		            price_promo.ps_recommended_finalized_agg pa using(promo_id)
		        LEFT JOIN
		            finalized_scenarios_cte sfsc ON fe.promo_id = sfsc.promo_id
				inner join 
                    global.planned_forex_rate pfr 
                    on 
                        pa.recommendation_date = pfr.date 
                        and pfr.source_currency_id = pa.currency_id
                        and pfr.target_currency_id = (SELECT target_currency_id FROM target_currency_cte)
		        GROUP BY
		            fe.promo_id,
		            sfsc.is_default
		    ),
		    stacked_original_cte AS (
		        SELECT
		            fe.promo_id,
		            ROUND(CASE WHEN coalesce(sfsc.is_default, false) THEN SUM(sales_units) ELSE NULL END::DECIMAL, 2) AS original_stack_sales_units,
		            ROUND(CASE WHEN coalesce(sfsc.is_default, false) THEN SUM(revenue * pfr.planned_conversion_multiplier) ELSE NULL END::DECIMAL, 2) AS original_stack_revenue,
		            ROUND(CASE WHEN coalesce(sfsc.is_default, false) THEN SUM(margin * pfr.planned_conversion_multiplier) ELSE NULL END::DECIMAL, 2) AS original_stack_margin,
		            ROUND(CASE WHEN coalesce(sfsc.is_default, false) THEN SUM(promo_spend * pfr.planned_conversion_multiplier) ELSE NULL END::DECIMAL, 2) AS original_stack_promo_spend,
		            ROUND((CASE WHEN coalesce(sfsc.is_default, false) THEN (SUM(margin) * 100 / NULLIF(SUM(revenue), 0)) ELSE NULL END)::NUMERIC, 2) AS original_stack_margin_percent,
		            ROUND(CASE WHEN coalesce(sfsc.is_default, false) THEN SUM(contribution_revenue * pfr.planned_conversion_multiplier) ELSE NULL END::DECIMAL, 2) AS original_stack_contribution_revenue,
		            ROUND(CASE WHEN coalesce(sfsc.is_default, false) THEN SUM(contribution_margin * pfr.planned_conversion_multiplier) ELSE NULL END::DECIMAL, 2) AS original_stack_contribution_margin,
		            ROUND((CASE WHEN coalesce(sfsc.is_default, false) THEN (SUM(contribution_margin) * 100 / NULLIF(SUM(contribution_revenue), 0)) ELSE NULL END)::NUMERIC, 2) AS original_stack_contribution_margin_percent,
		            ROUND((CASE WHEN coalesce(sfsc.is_default, false) THEN (SUM(incremental_margin) / NULLIF(ABS(SUM(baseline_margin)), 0)) ELSE NULL END)::DECIMAL * 100::DECIMAL, 2) AS original_stack_performance
		        FROM
		            price_promo.ps_recommended_finalized_stack_agg pa
		        INNER JOIN
		            promo_master_filtered_cte fe ON fe.promo_id = any(pa.promo_ids)
		        LEFT JOIN
		            finalized_scenarios_cte sfsc ON fe.promo_id = sfsc.promo_id
				inner join 
                    global.planned_forex_rate pfr 
                    on 
                        pa.recommendation_date = pfr.date 
                        and pfr.source_currency_id = pa.currency_id
                        and pfr.target_currency_id = (SELECT target_currency_id FROM target_currency_cte)
		        GROUP BY
		            fe.promo_id,
		            sfsc.is_default
		    ),
		    finalized_cte AS (
		        SELECT
		            sfsc.promo_id,
		            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.sales_units) ELSE SUM(original.sales_units) END::DECIMAL, 2) AS finalized_sales_units,
		            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.baseline_sales_units) ELSE SUM(original.baseline_sales_units) END::DECIMAL, 2) AS finalized_baseline_sales_units,
		            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.revenue * pfr.planned_conversion_multiplier) ELSE SUM(original.revenue * pfr.planned_conversion_multiplier) END::DECIMAL, 2) AS finalized_revenue,
		            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.baseline_revenue * pfr.planned_conversion_multiplier) ELSE SUM(original.baseline_revenue * pfr.planned_conversion_multiplier) END::DECIMAL, 2) AS finalized_baseline_revenue,
		            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.margin * pfr.planned_conversion_multiplier) ELSE SUM(original.margin * pfr.planned_conversion_multiplier) END::DECIMAL, 2) AS finalized_margin,
		            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.baseline_margin * pfr.planned_conversion_multiplier) ELSE SUM(original.baseline_margin * pfr.planned_conversion_multiplier) END::DECIMAL, 2) AS finalized_baseline_margin,
		            ROUND((CASE WHEN sfsc.is_default 
		                        THEN (SUM(override.margin) * 100 / NULLIF(SUM(override.revenue), 0))
		                        ELSE (SUM(original.margin) * 100 / NULLIF(SUM(original.revenue), 0)) END)::NUMERIC, 2) AS finalized_margin_percent,
		            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.promo_spend * pfr.planned_conversion_multiplier) ELSE SUM(original.promo_spend * pfr.planned_conversion_multiplier) END::DECIMAL, 2) AS finalized_promo_spend,
		            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.contribution_revenue * pfr.planned_conversion_multiplier) ELSE SUM(original.contribution_revenue * pfr.planned_conversion_multiplier) END::DECIMAL, 2) AS finalized_contribution_revenue,
		            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.contribution_margin * pfr.planned_conversion_multiplier) ELSE SUM(original.contribution_margin * pfr.planned_conversion_multiplier) END::DECIMAL, 2) AS finalized_contribution_margin,
		            ROUND((CASE WHEN sfsc.is_default 
		                        THEN (SUM(override.contribution_margin) * 100 / NULLIF(SUM(override.contribution_revenue), 0))
		                        ELSE (SUM(original.contribution_margin) * 100 / NULLIF(SUM(original.contribution_revenue), 0)) END)::NUMERIC, 2) AS finalized_contribution_margin_percent,
		            CASE 
		                WHEN sfsc.is_default 
		                THEN MIN(override.offer_type_combined_display_name)
		                ELSE MIN(original.offer_type_combined_display_name)
		            END AS finalized_discount,
		            ROUND((CASE WHEN sfsc.is_default 
		                        THEN (SUM(override.incremental_margin) / NULLIF(ABS(SUM(override.baseline_margin)), 0))
		                        ELSE (SUM(original.incremental_margin) / NULLIF(ABS(SUM(original.baseline_margin)), 0)) END)::DECIMAL * 100::DECIMAL, 2) AS finalized_performance,
		        	MAX(sfsc.total_inventory) as finalized_total_inventory,
					LEAST(100, GREATEST(0, CASE 
                        WHEN COALESCE(MAX(sfsc.total_inventory), 0) = 0 THEN 0 
                        ELSE ROUND(((ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.sales_units) ELSE SUM(original.sales_units) END::DECIMAL, 2) / MAX(sfsc.total_inventory)) * 100)::DECIMAL, 1) 
                    END)) AS finalized_st_percent

					FROM
		            finalized_scenarios_cte sfsc
		        LEFT JOIN 
		            price_promo.ps_recommended_finalized_agg original ON sfsc.promo_id = original.promo_id
		        LEFT JOIN 
		            price_promo.ps_recommended_finalized_override_agg override ON sfsc.promo_id = override.promo_id and original.recommendation_date = override.recommendation_date
				inner join 
                    global.planned_forex_rate pfr 
                    on 
                        original.recommendation_date = pfr.date 
                        and pfr.source_currency_id = original.currency_id
                        and pfr.target_currency_id = (SELECT target_currency_id FROM target_currency_cte)
				%2$s
				GROUP BY 
		            sfsc.promo_id,
		            sfsc.is_default
		    ),
		    stacked_finalized_cte AS (
		        SELECT
		            promo_id,
		            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.sales_units) ELSE SUM(original.sales_units) END::DECIMAL, 2) AS finalized_stack_sales_units,
		            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.baseline_sales_units) ELSE SUM(original.baseline_sales_units) END::DECIMAL, 2) AS finalized_stack_baseline_sales_units,
		            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.revenue * pfr.planned_conversion_multiplier) ELSE SUM(original.revenue * pfr.planned_conversion_multiplier) END::DECIMAL, 2) AS finalized_stack_revenue,
		            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.baseline_revenue * pfr.planned_conversion_multiplier) ELSE SUM(original.baseline_revenue * pfr.planned_conversion_multiplier) END::DECIMAL, 2) AS finalized_stack_baseline_revenue,
		            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.margin * pfr.planned_conversion_multiplier) ELSE SUM(original.margin * pfr.planned_conversion_multiplier) END::DECIMAL, 2) AS finalized_stack_margin,
		            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.baseline_margin * pfr.planned_conversion_multiplier) ELSE SUM(original.baseline_margin * pfr.planned_conversion_multiplier) END::DECIMAL, 2) AS finalized_stack_baseline_margin,
		            CASE 
		                WHEN sfsc.is_default 
		                THEN ROUND((SUM(override.margin) * 100 / NULLIF(SUM(override.revenue), 0))::NUMERIC, 2)
		                ELSE ROUND((SUM(original.margin) * 100 / NULLIF(SUM(original.revenue), 0))::NUMERIC, 2)
		            END AS finalized_stack_margin_percent,
		            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.promo_spend * pfr.planned_conversion_multiplier) ELSE SUM(original.promo_spend * pfr.planned_conversion_multiplier) END::DECIMAL, 2) AS finalized_stack_promo_spend,
		            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.contribution_revenue * pfr.planned_conversion_multiplier) ELSE SUM(original.contribution_revenue * pfr.planned_conversion_multiplier) END::DECIMAL, 2) AS finalized_stack_contribution_revenue,
		            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.contribution_margin * pfr.planned_conversion_multiplier) ELSE SUM(original.contribution_margin * pfr.planned_conversion_multiplier) END::DECIMAL, 2) AS finalized_stack_contribution_margin,
		            CASE 
		                WHEN sfsc.is_default 
		                THEN ROUND((SUM(override.contribution_margin) * 100 / NULLIF(SUM(override.contribution_revenue), 0))::NUMERIC, 2)
		                ELSE ROUND((SUM(original.contribution_margin) * 100 / NULLIF(SUM(original.contribution_revenue), 0))::NUMERIC, 2)
		            END AS finalized_stack_contribution_margin_percent,
		            CASE 
		                WHEN sfsc.is_default 
		                THEN ROUND((SUM(override.incremental_margin) / NULLIF(ABS(SUM(override.baseline_margin)), 0))::DECIMAL * 100::DECIMAL, 2)
		                ELSE ROUND((SUM(original.incremental_margin) / NULLIF(ABS(SUM(original.baseline_margin)), 0))::DECIMAL * 100::DECIMAL, 2)
		            END AS finalized_stack_performance,
					MAX(sfsc.total_inventory) as finalized_stack_total_inventory,
					LEAST(100, GREATEST(0, CASE 
                        WHEN COALESCE(MAX(sfsc.total_inventory), 0) = 0 THEN 0 
                        ELSE ROUND(((ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.sales_units) ELSE SUM(original.sales_units) END::DECIMAL, 2)/ MAX(sfsc.total_inventory)) * 100)::DECIMAL, 1) 
                    END)) AS finalized_stack_st_percent
		        FROM
		            finalized_scenarios_cte sfsc
		        LEFT JOIN 
		            price_promo.ps_recommended_finalized_stack_agg original ON sfsc.promo_id = ANY(original.promo_ids)
		        LEFT JOIN 
		            price_promo.ps_recommended_finalized_stack_override_agg override ON original.promo_ids = override.promo_ids and original.recommendation_date = override.recommendation_date
				inner join 
                    global.planned_forex_rate pfr 
                    on 
                        original.recommendation_date = pfr.date 
                        and pfr.source_currency_id = original.currency_id
                        and pfr.target_currency_id = (SELECT target_currency_id FROM target_currency_cte)
		        %2$s
				GROUP BY 
		            sfsc.promo_id,
		            sfsc.is_default
		    ),
		    ia_recc_cte AS (
		        SELECT
		            promo_id,
		            MIN(offer_type_combined_display_name) AS ia_recc_discount
		        FROM
		            price_promo.ps_recommended_ia_projected_agg pripa
		        WHERE
		            promo_id IN (SELECT DISTINCT promo_id FROM promo_master_filtered_cte)
		        GROUP BY
		            promo_id
		    ),
		    actualized_cte AS (
		        SELECT
		            praa.promo_id,
		            ROUND(SUM(sales_units)::DECIMAL, 2) AS actualized_sales_units,
		            ROUND(SUM(baseline_sales_units)::DECIMAL, 2) AS actualized_baseline_sales_units,
		            ROUND(SUM(incremental_sales_units)::DECIMAL, 2) AS actualized_incremental_sales_units,
		            ROUND(SUM(revenue * afr.planned_conversion_multiplier)::DECIMAL, 2) AS actualized_revenue,
		            ROUND(SUM(baseline_revenue * afr.planned_conversion_multiplier)::DECIMAL, 2) AS actualized_baseline_revenue,
		            ROUND(SUM(incremental_revenue * afr.planned_conversion_multiplier)::DECIMAL, 2) AS actualized_incremental_revenue,
		            ROUND(SUM(margin * afr.planned_conversion_multiplier)::DECIMAL, 2) AS actualized_margin,
		            ROUND(SUM(baseline_margin * afr.planned_conversion_multiplier)::DECIMAL, 2) AS actualized_baseline_margin,
		            ROUND(SUM(incremental_margin * afr.planned_conversion_multiplier)::DECIMAL, 2) AS actualized_incremental_margin,
		            ROUND(SUM(promo_spend * afr.planned_conversion_multiplier)::DECIMAL, 2) AS actualized_promo_spend,
		            CASE
		                WHEN SUM(revenue) != 0 THEN ROUND((SUM(margin) * 100 / SUM(revenue))::NUMERIC, 2)
		                ELSE 0
		            END AS actualized_margin_percent,
		            ROUND(SUM(contribution_revenue * afr.planned_conversion_multiplier)::DECIMAL, 2) AS actualized_contribution_revenue,
		            ROUND(SUM(contribution_margin * afr.planned_conversion_multiplier)::DECIMAL, 2) AS actualized_contribution_margin,
		            CASE
		                WHEN SUM(contribution_revenue) != 0 THEN ROUND((SUM(contribution_margin) * 100 / SUM(contribution_revenue))::NUMERIC, 2)
		                ELSE 0
		            END AS actualized_contribution_margin_percent,
		            CASE
		                WHEN SUM(baseline_margin) IS NULL OR SUM(baseline_margin) = 0 THEN NULL
		                ELSE ROUND((SUM(incremental_margin) / ABS(SUM(baseline_margin)))::DECIMAL * 100::DECIMAL, 2)
		            END AS performance,
					MAX(sfsc.total_inventory) AS actualized_total_inventory,
					LEAST(100,GREATEST(0, CASE 
            			WHEN COALESCE(MAX(sfsc.total_inventory), 0) = 0 THEN 0 
            			ELSE ROUND(((ROUND(SUM(sales_units)::DECIMAL, 2) / MAX(sfsc.total_inventory)) * 100)::DECIMAL, 
                		1)
       				END)) AS actualized_st_percent
		        FROM
		            price_promo.ps_recommended_actuals_agg praa
				LEFT JOIN
        			finalized_scenarios_cte sfsc ON praa.promo_id = sfsc.promo_id
				inner join 
                    global.actual_forex_rate afr 
                    on 
                        praa.recommendation_date = afr.date 
                        and afr.source_currency_id = praa.currency_id
                        and afr.target_currency_id = (SELECT target_currency_id FROM target_currency_cte)
		        WHERE
		            praa.promo_id IN (SELECT promo_id FROM promo_master_filtered_cte)
		        GROUP BY
		            praa.promo_id
            ),
            event_attributes_cte AS (
				SELECT 
					pm.promo_id,
					jsonb_object_agg(am.fe_identifier, eam.attribute_value) AS event_attributes
				FROM 
					promo_master_filtered_cte fep
				JOIN 
					price_promo.promo_master pm 
					ON fep.promo_id = pm.promo_id
				JOIN 
					price_promo.event_attribute_mapping eam 
					ON pm.event_id = eam.event_id
				JOIN 
					price_promo.attribute_master am 
					ON eam.attribute_id = am.id
				WHERE 
					am.module = ''event''
				GROUP BY 
					pm.promo_id
            ),
            config_values_cte AS (
                SELECT 
                    cast(config_value as integer) as submission_buffer_days
                FROM 
                    price_promo.tb_tool_configurations 
                WHERE 
                    module = ''event'' 
                    and config_name = ''vendor_submission_due_buffer_days''
            )
		    SELECT
		        pmc.promo_id,
		        pmc.promo_name AS promo_name,
		        pmc.start_date,
		        pmc.end_date,
		        pmc.event_id,
		        pmc.event_name::text as event_name,
		        pmc.is_locked,
		        um.name::text AS created_by,
		        um.user_code AS user_id,
		        pmc.offer_comment,
		        pmc.status_id::int as status_id,
		        pmc.status,
				pmc.review_status::text as review_status,
		        pmc.step_count::int as step_count,
		        pmc.products_count,
		        pmc.stores_count,
		        pmc.product_selection_type_id::int as product_selection_type_id,
		        pmc.product_selection_type,
		        pmc.store_selection_type_id::int as store_selection_type_id,
		        pmc.store_selection_type,
		        pmc.exclusion_selection_type_id::int as exclusion_selection_type_id,
		        pmc.exclusion_selection_type,
		        pmc.customer_type_id::int as customer_type_id,
		        pmc.customer_type,
		        pmc.offer_distribution_channel_id::int as offer_distribution_channel_id,
		        pmc.offer_distribution_channel,
		        pmc.last_approved_scenario_id::int as last_approved_scenario_id,
		        pmc.recommendation_type_id::int as recommendation_type_id,
		        pmc.recommendation_type,
		        pmc.is_under_processing,
		        pmc.is_auto_resimulated,
		        case when pmc.is_overridden_scenario_finalized = true then 1 else 0 end as is_overridden,
		        null::text as override_comment,
		        null::text as override_reason,
				tcm.currency_id,
                tcm.currency_symbol::text,
                tcm.currency_name::text,
		        --
		        prc.discount_level_id,
		        prc.discount_level::text as discount_level,
		        display_discount_type::text AS discount_type,
		        --
		        prc.sales_units_target::numeric AS target_sales_units,
		        prc.revenue_target::numeric AS target_revenue,
		        prc.margin_target::numeric AS target_margin,
		        --
		        price_promo.fn_get_performance_repr(COALESCE(acc.performance, fc.finalized_performance)) AS performance,
		
		        fc.finalized_margin,
		        fc.finalized_revenue,
		        fc.finalized_discount,
		        fc.finalized_promo_spend,
		        fc.finalized_sales_units,
		        fc.finalized_margin_percent,
		        fc.finalized_contribution_margin,
		        fc.finalized_contribution_revenue,
		        fc.finalized_contribution_margin_percent,
		    	iarc.ia_recc_discount,
				acc.actualized_contribution_margin,
				acc.actualized_contribution_margin_percent,
		        fc.finalized_baseline_margin,
		        fc.finalized_baseline_revenue,
		        fc.finalized_baseline_sales_units,
		        oc.original_margin,
		        oc.original_revenue,
		        oc.original_discount,
		        oc.original_promo_spend,
		        oc.original_sales_units,
		        oc.original_margin_percent,
		        oc.original_contribution_margin,
		        oc.original_contribution_revenue,
		        oc.original_contribution_margin_percent,
		        sfc.finalized_stack_baseline_revenue,
		        sfc.finalized_stack_baseline_sales_units,
		        sfc.finalized_stack_margin,
		        sfc.finalized_stack_revenue,
		        sfc.finalized_stack_promo_spend,
		        sfc.finalized_stack_sales_units,
		        sfc.finalized_stack_margin_percent,
		        sfc.finalized_stack_contribution_margin,
		        sfc.finalized_stack_contribution_revenue,
		        sfc.finalized_stack_contribution_margin_percent,
				sfc.finalized_stack_baseline_margin,
		        soc.original_stack_margin,
	            soc.original_stack_revenue,
	            soc.original_stack_promo_spend,
	            soc.original_stack_sales_units,
	            soc.original_stack_margin_percent,
	            soc.original_stack_contribution_margin,
	            soc.original_stack_contribution_revenue,
	            soc.original_stack_contribution_margin_percent,
				fc.finalized_total_inventory,
				fc.finalized_st_percent,
				sfc.finalized_stack_st_percent,
				acc.actualized_st_percent,
				pmc.vendor_portal_status_id::integer,
			    pmc.vendor_created_by::text,
				vum.name::text AS vendor_created_by_name,
			    pmc.vendor_portal_status::text,
                pmc.created_at::date,
                pmc.updated_at::date,
                eac.event_attributes,
                ((eac.event_attributes->>''vendor_due_date'')::date - INTERVAL ''1 day'' * cv.submission_buffer_days)::date AS submission_due_date

		    FROM 
		        promo_master_details_cte pmc
		    LEFT JOIN 
		        promo_rules_cte prc ON pmc.promo_id = prc.promo_id
		    LEFT JOIN 
		        finalized_cte fc ON pmc.promo_id = fc.promo_id
		    LEFT JOIN 
		        stacked_finalized_cte sfc ON pmc.promo_id = sfc.promo_id
		    LEFT JOIN 
		        ia_recc_cte iarc ON pmc.promo_id = iarc.promo_id
		    LEFT JOIN
		        original_cte oc ON pmc.promo_id = oc.promo_id
		    LEFT JOIN
		        stacked_original_cte soc ON pmc.promo_id = soc.promo_id
		    LEFT JOIN 
		        actualized_cte acc ON pmc.promo_id = acc.promo_id
            LEFT JOIN
                event_attributes_cte eac ON pmc.promo_id = eac.promo_id
		    LEFT JOIN 
		        global.user_master um ON pmc.created_by = um.user_code
			LEFT JOIN 
    			global.user_master vum ON pmc.vendor_created_by = vum.user_code
			inner join
            	global.tb_currency_master tcm
            	on tcm.currency_id = (select target_currency_id from target_currency_cte)
			cross join
				config_values_cte cv
		    order by promo_id;', where_str, strict_date_check, COALESCE(request_payload->>'target_currency_id', NULL)
        );

    ELSE

		RAISE NOTICE 'Start Date: %, End Date: %', request_payload->>'start_date', request_payload->>'end_date';
		
        -- Construct the filtered promo query
        _query := format(
            '
			WITH final_eligible_promos_cte AS (
				select
					*
				from
					price_promo.promo_master
				where
					promo_id = any(array(select * from price_promo.fn_filter_promos(
						''%1$s'',
						''%2$s'',
						''%3$s'',
						''%4$s'',
						%10$L,
						%11$L::int[],
						%5$s,
						%8$s,
						%9$s
						)
			))),
			
			promo_master_filtered_cte AS (
		        SELECT
		            fepc.event_id,
		            fepc.promo_id,
		            fepc.name AS promo_name,
		            fepc.start_date,
		            fepc.end_date,
		            fepc.created_by,
		            fepc.status AS status_id,
		            fepc.step_count,
		            fepc.offer_comment,
		            fepc.products_count,
		            fepc.stores_count,
		            fepc.product_selection_type AS product_selection_type_id,
		            fepc.exclusion_selection_type as exclusion_selection_type_id,
		            fepc.store_selection_type AS store_selection_type_id,
		            fepc.customer_type AS customer_type_id,
		            fepc.offer_distribution_channel AS offer_distribution_channel_id,
		            fepc.last_approved_scenario_id,
		            fepc.recommendation_type_id,
		            fepc.is_under_processing,
		            fepc.is_auto_resimulated,
		            fepc.is_overridden_scenario_finalized,
		            fepc.vendor_portal_status as vendor_portal_status_id,
		            fepc.vendor_created_by,
					fepc.review_status, 
					fepc.created_at,
					fepc.updated_at
		        FROM
		            final_eligible_promos_cte fepc
		    ),
			target_currency_cte AS (
			    SELECT 
					fn_get_target_currency_id as target_currency_id  
				from 
					price_promo.fn_get_target_currency_id(
						(
							SELECT array_agg(DISTINCT currency_id) as source_currency_id
							FROM price_promo.ps_recommended_scenarios_agg 
							WHERE promo_id IN (
								SELECT promo_id FROM price_promo.promo_master 
								where event_id in (select event_id from promo_master_filtered_cte)
							)
						),
						%7$L::integer
				)
			),
		    override_reason_comment AS(
		        SELECT
		            tpof.promo_id,
		            tpof.comment as override_comment,
		            tor.reason as override_reason
		        FROM
		            price_promo.tb_promo_override_forecast tpof
		        LEFT JOIN price_promo.tb_override_reason tor
		        ON tpof.reason = tor.id
		        WHERE
		            (tpof.promo_id, tpof.scenario_id) IN (
				    SELECT promo_id, coalesce(last_approved_scenario_id, 0) as scenario_id
				    FROM price_promo.promo_master
				    WHERE promo_id IN (SELECT promo_id FROM final_eligible_promos_cte)
				)
		    ),
		    promo_master_details_cte AS (
		        SELECT
		            pmfc.promo_id,
		            pmfc.promo_name,
		            pmfc.start_date,
		            pmfc.end_date,
		            em.event_id,
		            em.name as event_name, 
		            em.is_locked,
		            pmfc.created_by,
		            pmfc.status_id,
		            STRING_AGG(psc.status_name::text, '', '') AS status,
					MAX(psrc.review_status)::text AS review_status,
		            pmfc.step_count,
		            pmfc.offer_comment,
		            pmfc.products_count,
		            pmfc.stores_count,
		            pmfc.product_selection_type_id,
		            STRING_AGG(
		                CASE
		                    WHEN pstc.product_selection_sub_type::text IS NOT NULL THEN CONCAT(pstc.product_selection_type::text, ''-'', pstc.product_selection_sub_type::text)
		                    ELSE pstc.product_selection_type::text
		                END,
		                '', ''
		            ) AS product_selection_type,
		            pmfc.store_selection_type_id,
		            STRING_AGG(
		                CASE
		                    WHEN sstc.store_selection_sub_type::text IS NOT NULL THEN CONCAT(sstc.store_selection_type::text, ''-'', sstc.store_selection_sub_type::text)
		                    ELSE sstc.store_selection_type::text
		                END,
		                '', ''
		            ) AS store_selection_type,
		            pmfc.exclusion_selection_type_id, 
		            case 
		            	when exclusion_selection_type_id = 1 then ''hierarchy based exclusion ''
		            	when exclusion_selection_type_id = 2 then ''product based exclusion ''
		            	when exclusion_selection_type_id = 3 then ''product group based exclusion ''
		            	when exclusion_selection_type_id = 4 then ''file upload based exclusion ''
		            end as exclusion_selection_type,
		            pmfc.customer_type_id,
		            STRING_AGG(tctc.customer_type::text, '', '') AS customer_type,
		            pmfc.offer_distribution_channel_id,
		            STRING_AGG(todcc.channel::text, '', '') AS offer_distribution_channel,
		            pmfc.last_approved_scenario_id,
		            pmfc.recommendation_type_id,
		            STRING_AGG(tasm.name, '', '') AS recommendation_type,
		            pmfc.is_under_processing,
		            pmfc.is_auto_resimulated,
		            pmfc.is_overridden_scenario_finalized,
		            pmfc.vendor_portal_status_id,
		            pmfc.vendor_created_by,
					vum.name as vendor_created_by_name,
		            pvpsc.status_name as vendor_portal_status,
					pmfc.created_at,
					pmfc.updated_at
		        FROM
		            final_eligible_promos_cte fep
		        JOIN
		            promo_master_filtered_cte pmfc ON fep.promo_id = pmfc.promo_id
		        left join 
		            price_promo.event_master em on pmfc.event_id = em.event_id 
		        LEFT JOIN
		            price_promo.promo_status_config psc ON pmfc.status_id = psc.status_id
		        LEFT JOIN
		            price_promo.product_selection_type_config pstc ON pmfc.product_selection_type_id = pstc.id
		        LEFT JOIN
		            price_promo.store_selection_type_config sstc ON pmfc.store_selection_type_id = sstc.id
		        LEFT JOIN
		            price_promo.tb_customer_type_config tctc ON pmfc.customer_type_id = tctc.id
		        LEFT JOIN
		            price_promo.tb_offer_distributor_channel_config todcc ON pmfc.offer_distribution_channel_id = todcc.id
		        LEFT JOIN 
		            metaschema.tb_app_sub_master tasm ON pmfc.recommendation_type_id = tasm.id
		        LEFT JOIN
		            price_promo.promo_vendor_portal_status_config pvpsc ON pmfc.vendor_portal_status_id = pvpsc.status_id
				LEFT JOIN 
					price_promo.promo_status_review_config psrc ON psrc.id = pmfc.review_status
				LEFT JOIN 
            		global.user_master vum ON pmfc.vendor_created_by = vum.user_code
		        GROUP BY
		            pmfc.promo_id, pmfc.promo_name, pmfc.start_date, pmfc.end_date, em.event_id, em.name, em.is_locked, pmfc.created_by, pmfc.status_id, pmfc.review_status, pmfc.step_count,
		            pmfc.offer_comment, pmfc.products_count, pmfc.stores_count, pmfc.product_selection_type_id, pmfc.store_selection_type_id, pmfc.exclusion_selection_type_id,
		            pmfc.customer_type_id, pmfc.offer_distribution_channel_id, pmfc.last_approved_scenario_id,
		            pmfc.recommendation_type_id, pmfc.is_under_processing, pmfc.is_auto_resimulated, pmfc.is_overridden_scenario_finalized,
		            pmfc.vendor_portal_status_id,
		            pmfc.vendor_created_by,
		            pvpsc.status_name,
					vum.name,
					pmfc.created_at,
					pmfc.updated_at
		    ),
		    promo_rules_cte AS (
		        SELECT
		            pr.promo_id,
		            max(pr.discount_level) AS discount_level_id,
		            string_agg(dlc.discount_level_value, '','') AS discount_level,
		            max(pr.discount_type) as discount_type,
		            max(tasm.display_name) as display_discount_type,
		            max(pr.units_target) as sales_units_target,
		            max(pr.revenue_target) as revenue_target,
		            max(pr.gross_margin_target) as margin_target
		        FROM
		            price_promo.ps_rules pr
		        LEFT JOIN
		            price_promo.discount_level_config dlc ON dlc.discount_level_id = any(pr.product_discount_level)
		        LEFT JOIN
		            metaschema.tb_app_sub_master tasm ON pr.discount_type_id = tasm.id
		        WHERE
		            pr.promo_id IN (SELECT DISTINCT promo_id FROM final_eligible_promos_cte)
					and dlc.category = ''product''
                group by pr.promo_id
		    ),
		    finalized_scenarios_cte AS (
		        SELECT 
		            fep.promo_id,
		            pof.is_default,
					pm.total_inventory
		        FROM 
		            final_eligible_promos_cte fep
		        LEFT JOIN 
		            price_promo.promo_master pm ON fep.promo_id = pm.promo_id
		        LEFT JOIN 
		            price_promo.tb_promo_override_forecast pof ON fep.promo_id = pof.promo_id AND coalesce(pm.last_approved_scenario_id,0) = pof.scenario_id
		    ),
		    original_cte AS (
		        SELECT
		            fe.promo_id,
		            ROUND(CASE WHEN coalesce(sfsc.is_default, false) THEN SUM(sales_units) ELSE NULL END::DECIMAL, 2) AS original_sales_units,
		            ROUND(CASE WHEN coalesce(sfsc.is_default, false) THEN SUM(revenue * pfr.planned_conversion_multiplier) ELSE NULL END::DECIMAL, 2) AS original_revenue,
		            ROUND(CASE WHEN coalesce(sfsc.is_default, false) THEN SUM(margin * pfr.planned_conversion_multiplier) ELSE NULL END::DECIMAL, 2) AS original_margin,
		            ROUND(CASE WHEN coalesce(sfsc.is_default, false) THEN SUM(promo_spend * pfr.planned_conversion_multiplier) ELSE NULL END::DECIMAL, 2) AS original_promo_spend,
		            ROUND((CASE WHEN coalesce(sfsc.is_default, false) THEN (SUM(margin) * 100 / NULLIF(SUM(revenue), 0)) ELSE NULL END)::NUMERIC, 2) AS original_margin_percent,
		            ROUND(CASE WHEN coalesce(sfsc.is_default, false) THEN SUM(contribution_revenue * pfr.planned_conversion_multiplier) ELSE NULL END::DECIMAL, 2) AS original_contribution_revenue,
		            ROUND(CASE WHEN coalesce(sfsc.is_default, false) THEN SUM(contribution_margin * pfr.planned_conversion_multiplier) ELSE NULL END::DECIMAL, 2) AS original_contribution_margin,
		            ROUND((CASE WHEN coalesce(sfsc.is_default, false) THEN (SUM(contribution_margin) * 100 / NULLIF(SUM(contribution_revenue), 0)) ELSE NULL END)::NUMERIC, 2) AS original_contribution_margin_percent,
		            CASE WHEN coalesce(sfsc.is_default, false) THEN MIN(offer_type_combined_display_name) ELSE NULL END AS original_discount,
		            ROUND((CASE WHEN coalesce(sfsc.is_default, false) THEN (SUM(incremental_margin) / NULLIF(ABS(SUM(baseline_margin)), 0)) ELSE NULL END)::DECIMAL * 100::DECIMAL, 2) AS original_performance
		        FROM
		            final_eligible_promos_cte fe 
		        INNER JOIN
		            price_promo.ps_recommended_finalized_agg pa using(promo_id)
		        LEFT JOIN
		            finalized_scenarios_cte sfsc ON fe.promo_id = sfsc.promo_id
				inner join 
                    global.planned_forex_rate pfr 
                    on 
                        pa.recommendation_date = pfr.date 
                        and pfr.source_currency_id = pa.currency_id
                        and pfr.target_currency_id = (SELECT target_currency_id FROM target_currency_cte)
		        GROUP BY
		            fe.promo_id,
		            sfsc.is_default
		    ),
		    stacked_original_cte AS (
		        SELECT
		            fe.promo_id,
		            ROUND(CASE WHEN coalesce(sfsc.is_default, false) THEN SUM(sales_units) ELSE NULL END::DECIMAL, 2) AS original_stack_sales_units,
		            ROUND(CASE WHEN coalesce(sfsc.is_default, false) THEN SUM(revenue * pfr.planned_conversion_multiplier) ELSE NULL END::DECIMAL, 2) AS original_stack_revenue,
		            ROUND(CASE WHEN coalesce(sfsc.is_default, false) THEN SUM(margin * pfr.planned_conversion_multiplier) ELSE NULL END::DECIMAL, 2) AS original_stack_margin,
		            ROUND(CASE WHEN coalesce(sfsc.is_default, false) THEN SUM(promo_spend * pfr.planned_conversion_multiplier) ELSE NULL END::DECIMAL, 2) AS original_stack_promo_spend,
		            ROUND((CASE WHEN coalesce(sfsc.is_default, false) THEN (SUM(margin) * 100 / NULLIF(SUM(revenue), 0)) ELSE NULL END)::NUMERIC, 2) AS original_stack_margin_percent,
		            ROUND(CASE WHEN coalesce(sfsc.is_default, false) THEN SUM(contribution_revenue * pfr.planned_conversion_multiplier) ELSE NULL END::DECIMAL, 2) AS original_stack_contribution_revenue,
		            ROUND(CASE WHEN coalesce(sfsc.is_default, false) THEN SUM(contribution_margin * pfr.planned_conversion_multiplier) ELSE NULL END::DECIMAL, 2) AS original_stack_contribution_margin,
		            ROUND((CASE WHEN coalesce(sfsc.is_default, false) THEN (SUM(contribution_margin) * 100 / NULLIF(SUM(contribution_revenue), 0)) ELSE NULL END)::NUMERIC, 2) AS original_stack_contribution_margin_percent,
		            ROUND((CASE WHEN coalesce(sfsc.is_default, false) THEN (SUM(incremental_margin) / NULLIF(ABS(SUM(baseline_margin)), 0)) ELSE NULL END)::DECIMAL * 100::DECIMAL, 2) AS original_stack_performance
		        FROM
		            price_promo.ps_recommended_finalized_stack_agg pa
		        INNER JOIN
		            final_eligible_promos_cte fe ON fe.promo_id = any(pa.promo_ids)
		        LEFT JOIN
		            finalized_scenarios_cte sfsc ON fe.promo_id = sfsc.promo_id
				inner join 
                    global.planned_forex_rate pfr 
                    on 
                        pa.recommendation_date = pfr.date 
                        and pfr.source_currency_id = pa.currency_id
                        and pfr.target_currency_id = (SELECT target_currency_id FROM target_currency_cte)
		        GROUP BY
		            fe.promo_id,
		            sfsc.is_default
		    ),
		    finalized_cte AS (
		        SELECT
		            sfsc.promo_id,
		            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.sales_units) ELSE SUM(original.sales_units) END::DECIMAL, 2) AS finalized_sales_units,
		            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.baseline_sales_units) ELSE SUM(original.baseline_sales_units) END::DECIMAL, 2) AS finalized_baseline_sales_units,
		            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.revenue * pfr.planned_conversion_multiplier) ELSE SUM(original.revenue * pfr.planned_conversion_multiplier) END::DECIMAL, 2) AS finalized_revenue,
		            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.baseline_revenue * pfr.planned_conversion_multiplier) ELSE SUM(original.baseline_revenue * pfr.planned_conversion_multiplier) END::DECIMAL, 2) AS finalized_baseline_revenue,
		            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.margin * pfr.planned_conversion_multiplier) ELSE SUM(original.margin * pfr.planned_conversion_multiplier) END::DECIMAL, 2) AS finalized_margin,
		            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.baseline_margin * pfr.planned_conversion_multiplier) ELSE SUM(original.baseline_margin * pfr.planned_conversion_multiplier) END::DECIMAL, 2) AS finalized_baseline_margin,
		            ROUND((CASE WHEN sfsc.is_default 
		                        THEN (SUM(override.margin) * 100 / NULLIF(SUM(override.revenue), 0))
		                        ELSE (SUM(original.margin) * 100 / NULLIF(SUM(original.revenue), 0)) END)::NUMERIC, 2) AS finalized_margin_percent,
		            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.promo_spend * pfr.planned_conversion_multiplier) ELSE SUM(original.promo_spend * pfr.planned_conversion_multiplier) END::DECIMAL, 2) AS finalized_promo_spend,
		            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.contribution_revenue * pfr.planned_conversion_multiplier) ELSE SUM(original.contribution_revenue * pfr.planned_conversion_multiplier) END::DECIMAL, 2) AS finalized_contribution_revenue,
		            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.contribution_margin * pfr.planned_conversion_multiplier) ELSE SUM(original.contribution_margin * pfr.planned_conversion_multiplier) END::DECIMAL, 2) AS finalized_contribution_margin,
		            ROUND((CASE WHEN sfsc.is_default 
		                        THEN (SUM(override.contribution_margin) * 100 / NULLIF(SUM(override.contribution_revenue), 0))
		                        ELSE (SUM(original.contribution_margin) * 100 / NULLIF(SUM(original.contribution_revenue), 0)) END)::NUMERIC, 2) AS finalized_contribution_margin_percent,
		            CASE 
		                WHEN sfsc.is_default 
		                THEN MIN(override.offer_type_combined_display_name)
		                ELSE MIN(original.offer_type_combined_display_name)
		            END AS finalized_discount,
		            ROUND((CASE WHEN sfsc.is_default 
		                        THEN (SUM(override.incremental_margin) / NULLIF(ABS(SUM(override.baseline_margin)), 0))
		                        ELSE (SUM(original.incremental_margin) / NULLIF(ABS(SUM(original.baseline_margin)), 0)) END)::DECIMAL * 100::DECIMAL, 2) AS finalized_performance,
					
					MAX(sfsc.total_inventory) as finalized_total_inventory,
					LEAST(100, GREATEST(0, CASE 
                        WHEN COALESCE(MAX(sfsc.total_inventory), 0) = 0 THEN 0 
                        ELSE ROUND(((ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.sales_units) ELSE SUM(original.sales_units) END::DECIMAL, 2) / MAX(sfsc.total_inventory)) * 100)::DECIMAL, 1) 
                    END)) AS finalized_st_percent

		        FROM
		            finalized_scenarios_cte sfsc
		        LEFT JOIN 
		            price_promo.ps_recommended_finalized_agg original ON sfsc.promo_id = original.promo_id
		        LEFT JOIN 
		            price_promo.ps_recommended_finalized_override_agg override ON sfsc.promo_id = override.promo_id and original.recommendation_date = override.recommendation_date
				inner join 
                    global.planned_forex_rate pfr 
                    on 
                        original.recommendation_date = pfr.date 
                        and pfr.source_currency_id = original.currency_id
                        and pfr.target_currency_id = (SELECT target_currency_id FROM target_currency_cte)
		        %6$s
				GROUP BY 
		            sfsc.promo_id,
		            sfsc.is_default
		    ),
		    stacked_finalized_cte AS (
		        SELECT
		            sfsc.promo_id,
		            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.sales_units) ELSE SUM(original.sales_units) END::DECIMAL, 2) AS finalized_stack_sales_units,
		            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.baseline_sales_units) ELSE SUM(original.baseline_sales_units) END::DECIMAL, 2) AS finalized_stack_baseline_sales_units,
		            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.revenue * pfr.planned_conversion_multiplier) ELSE SUM(original.revenue * pfr.planned_conversion_multiplier) END::DECIMAL, 2) AS finalized_stack_revenue,
		            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.baseline_revenue * pfr.planned_conversion_multiplier) ELSE SUM(original.baseline_revenue * pfr.planned_conversion_multiplier) END::DECIMAL, 2) AS finalized_stack_baseline_revenue,
		            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.margin * pfr.planned_conversion_multiplier) ELSE SUM(original.margin * pfr.planned_conversion_multiplier) END::DECIMAL, 2) AS finalized_stack_margin,
		            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.baseline_margin * pfr.planned_conversion_multiplier) ELSE SUM(original.baseline_margin * pfr.planned_conversion_multiplier) END::DECIMAL, 2) AS finalized_stack_baseline_margin,
		            CASE 
		                WHEN sfsc.is_default 
		                THEN ROUND((SUM(override.margin) * 100 / NULLIF(SUM(override.revenue), 0))::NUMERIC, 2)
		                ELSE ROUND((SUM(original.margin) * 100 / NULLIF(SUM(original.revenue), 0))::NUMERIC, 2)
		            END AS finalized_stack_margin_percent,
		            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.promo_spend * pfr.planned_conversion_multiplier) ELSE SUM(original.promo_spend * pfr.planned_conversion_multiplier) END::DECIMAL, 2) AS finalized_stack_promo_spend,
		            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.contribution_revenue * pfr.planned_conversion_multiplier) ELSE SUM(original.contribution_revenue * pfr.planned_conversion_multiplier) END::DECIMAL, 2) AS finalized_stack_contribution_revenue,
		            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.contribution_margin * pfr.planned_conversion_multiplier) ELSE SUM(original.contribution_margin * pfr.planned_conversion_multiplier) END::DECIMAL, 2) AS finalized_stack_contribution_margin,
		            CASE 
		                WHEN sfsc.is_default 
		                THEN ROUND((SUM(override.contribution_margin) * 100 / NULLIF(SUM(override.contribution_revenue), 0))::NUMERIC, 2)
		                ELSE ROUND((SUM(original.contribution_margin) * 100 / NULLIF(SUM(original.contribution_revenue), 0))::NUMERIC, 2)
		            END AS finalized_stack_contribution_margin_percent,
		            CASE 
		                WHEN sfsc.is_default 
		                THEN ROUND((SUM(override.incremental_margin) / NULLIF(ABS(SUM(override.baseline_margin)), 0))::DECIMAL * 100::DECIMAL, 2)
		                ELSE ROUND((SUM(original.incremental_margin) / NULLIF(ABS(SUM(original.baseline_margin)), 0))::DECIMAL * 100::DECIMAL, 2)
		            END AS finalized_stack_performance,
					MAX(sfsc.total_inventory) as total_inventory,
					LEAST(100, GREATEST(0, CASE 
                        WHEN COALESCE(MAX(sfsc.total_inventory), 0) = 0 THEN 0 
                        ELSE ROUND(((ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.sales_units) ELSE SUM(original.sales_units) END::DECIMAL, 2)/ MAX(sfsc.total_inventory)) * 100)::DECIMAL, 1) 
                    END)) AS finalized_stack_st_percent
					
		        FROM
		            finalized_scenarios_cte sfsc
		        LEFT JOIN 
		            price_promo.ps_recommended_finalized_stack_agg original ON sfsc.promo_id = ANY(original.promo_ids)
		        LEFT JOIN 
		            price_promo.ps_recommended_finalized_stack_override_agg override ON original.promo_ids = override.promo_ids and original.recommendation_date = override.recommendation_date
				inner join 
                    global.planned_forex_rate pfr 
                    on 
                        original.recommendation_date = pfr.date 
                        and pfr.source_currency_id = original.currency_id
                        and pfr.target_currency_id = (SELECT target_currency_id FROM target_currency_cte)
		        %6$s
				GROUP BY 
		            sfsc.promo_id,
		            sfsc.is_default
		    ),
		    ia_recc_cte AS (
		        SELECT
		            promo_id,
		            MIN(offer_type_combined_display_name) AS ia_recc_discount
		        FROM
		            price_promo.ps_recommended_ia_projected_agg pripa
		        WHERE
		            promo_id IN (SELECT DISTINCT promo_id FROM final_eligible_promos_cte)
		        GROUP BY
		            promo_id
		    ),
		    actualized_cte AS (
		        SELECT
		            praa.promo_id,
		            ROUND(SUM(sales_units)::DECIMAL, 2) AS actualized_sales_units,
		            ROUND(SUM(baseline_sales_units)::DECIMAL, 2) AS actualized_baseline_sales_units,
		            ROUND(SUM(incremental_sales_units)::DECIMAL, 2) AS actualized_incremental_sales_units,
		            ROUND(SUM(revenue * afr.planned_conversion_multiplier)::DECIMAL, 2) AS actualized_revenue,
		            ROUND(SUM(baseline_revenue * afr.planned_conversion_multiplier)::DECIMAL, 2) AS actualized_baseline_revenue,
		            ROUND(SUM(incremental_revenue * afr.planned_conversion_multiplier)::DECIMAL, 2) AS actualized_incremental_revenue,
		            ROUND(SUM(margin * afr.planned_conversion_multiplier)::DECIMAL, 2) AS actualized_margin,
		            ROUND(SUM(baseline_margin * afr.planned_conversion_multiplier)::DECIMAL, 2) AS actualized_baseline_margin,
		            ROUND(SUM(incremental_margin * afr.planned_conversion_multiplier)::DECIMAL, 2) AS actualized_incremental_margin,
		            ROUND(SUM(promo_spend * afr.planned_conversion_multiplier)::DECIMAL, 2) AS actualized_promo_spend,
		            CASE
		                WHEN SUM(revenue) != 0 THEN ROUND((SUM(margin) * 100 / SUM(revenue))::NUMERIC, 2)
		                ELSE 0
		            END AS actualized_margin_percent,
		            ROUND(SUM(contribution_revenue * afr.planned_conversion_multiplier)::DECIMAL, 2) AS actualized_contribution_revenue,
		            ROUND(SUM(contribution_margin * afr.planned_conversion_multiplier)::DECIMAL, 2) AS actualized_contribution_margin,
		            CASE
		                WHEN SUM(contribution_revenue) != 0 THEN ROUND((SUM(contribution_margin) * 100 / SUM(contribution_revenue))::NUMERIC, 2)
		                ELSE 0
		            END AS actualized_contribution_margin_percent,
		            CASE
		                WHEN SUM(baseline_margin) IS NULL OR SUM(baseline_margin) = 0 THEN NULL
		                ELSE ROUND((SUM(incremental_margin) / ABS(SUM(baseline_margin)))::DECIMAL * 100::DECIMAL, 2)
		            END AS performance,
					MAX(sfsc.total_inventory),
					LEAST(100,GREATEST(0, CASE 
            			WHEN COALESCE(MAX(sfsc.total_inventory), 0) = 0 THEN 0 
            			ELSE ROUND(((ROUND(SUM(sales_units)::DECIMAL, 2) / MAX(sfsc.total_inventory)) * 100)::DECIMAL, 
                		1)
       				END)) AS actualized_st_percent
		        FROM
		            price_promo.ps_recommended_actuals_agg praa
				LEFT JOIN
        			finalized_scenarios_cte sfsc ON praa.promo_id = sfsc.promo_id
				inner join 
                    global.actual_forex_rate afr 
                    on 
                        praa.recommendation_date = afr.date 
                        and afr.source_currency_id = praa.currency_id
                        and afr.target_currency_id = (SELECT target_currency_id FROM target_currency_cte)
		        WHERE
		            praa.promo_id IN (SELECT promo_id FROM final_eligible_promos_cte)
		        GROUP BY
		            praa.promo_id
            ),
            event_attributes_cte AS (
				SELECT 
					pm.promo_id,
					jsonb_object_agg(am.fe_identifier, eam.attribute_value) AS event_attributes
				FROM 
					final_eligible_promos_cte fep
				JOIN 
					price_promo.promo_master pm 
					ON fep.promo_id = pm.promo_id
				JOIN 
					price_promo.event_attribute_mapping eam 
					ON pm.event_id = eam.event_id
				JOIN 
					price_promo.attribute_master am 
					ON eam.attribute_id = am.id
				WHERE 
					am.module = ''event''
				GROUP BY 
					pm.promo_id
            ),
            config_values_cte AS (
                SELECT 
                    cast(config_value as integer) as submission_buffer_days
                FROM 
                    price_promo.tb_tool_configurations 
                WHERE 
                    module = ''event'' 
                    and config_name = ''vendor_submission_due_buffer_days''
            )
		    SELECT
		        pmc.promo_id,
		        pmc.promo_name AS promo_name,
		        pmc.start_date,
		        pmc.end_date,
		        pmc.event_id,
		        pmc.event_name::text as event_name,
		        pmc.is_locked,
		        um.name::text AS created_by,
		        um.user_code AS user_id,
		        pmc.offer_comment,
		        pmc.status_id::int as status_id,
		        pmc.status,
				pmc.review_status as review_status,
		        pmc.step_count::int as step_count,
		        pmc.products_count,
		        pmc.stores_count,
		        pmc.product_selection_type_id::int as product_selection_type_id,
		        pmc.product_selection_type,
		        pmc.store_selection_type_id::int as store_selection_type_id,
		        pmc.store_selection_type,
		        pmc.exclusion_selection_type_id::int as exclusion_selection_type_id,
		        pmc.exclusion_selection_type,
		        pmc.customer_type_id::int as customer_type_id,
		        pmc.customer_type,
		        pmc.offer_distribution_channel_id::int as offer_distribution_channel_id,
		        pmc.offer_distribution_channel,
		        pmc.last_approved_scenario_id::int as last_approved_scenario_id,
		        pmc.recommendation_type_id::int as recommendation_type_id,
		        pmc.recommendation_type,
		        pmc.is_under_processing,
		        pmc.is_auto_resimulated,
		        case when pmc.is_overridden_scenario_finalized = true then 1 else 0 end as is_overridden,
		        orcc.override_comment,
		        orcc.override_reason,
				tcm.currency_id,
                tcm.currency_symbol::text,
                tcm.currency_name::text,
		        --
		        prc.discount_level_id,
		        prc.discount_level::text as discount_level,
		        display_discount_type::text AS discount_type,
		        --
		        prc.sales_units_target::numeric AS target_sales_units,
		        prc.revenue_target::numeric AS target_revenue,
		        prc.margin_target::numeric AS target_margin,
		        --
		        price_promo.fn_get_performance_repr(COALESCE(acc.performance, fc.finalized_performance)) AS performance,
		
		        fc.finalized_margin,
		        fc.finalized_revenue,
		        fc.finalized_discount,
		        fc.finalized_promo_spend,
		        fc.finalized_sales_units,
		        fc.finalized_margin_percent,
		        fc.finalized_contribution_margin,
		        fc.finalized_contribution_revenue,
		        fc.finalized_contribution_margin_percent,
		    	iarc.ia_recc_discount,
				acc.actualized_contribution_margin,
				acc.actualized_contribution_margin_percent,
		        fc.finalized_baseline_margin,
		        fc.finalized_baseline_revenue,
		        fc.finalized_baseline_sales_units,

		        oc.original_margin,
		        oc.original_revenue,
		        oc.original_discount,
		        oc.original_promo_spend,
		        oc.original_sales_units,
		        oc.original_margin_percent,
		        oc.original_contribution_margin,
		        oc.original_contribution_revenue,
		        oc.original_contribution_margin_percent,
		        sfc.finalized_stack_baseline_revenue,
		        sfc.finalized_stack_baseline_sales_units,
		        sfc.finalized_stack_margin,
		        sfc.finalized_stack_revenue,
		        sfc.finalized_stack_promo_spend,
		        sfc.finalized_stack_sales_units,
		        sfc.finalized_stack_margin_percent,
		        sfc.finalized_stack_contribution_margin,
		        sfc.finalized_stack_contribution_revenue,
		        sfc.finalized_stack_contribution_margin_percent,
				sfc.finalized_stack_baseline_margin,
		        soc.original_stack_margin,
	            soc.original_stack_revenue,
	            soc.original_stack_promo_spend,
	            soc.original_stack_sales_units,
	            soc.original_stack_margin_percent,
	            soc.original_stack_contribution_margin,
	            soc.original_stack_contribution_revenue,
	            soc.original_stack_contribution_margin_percent,
				fc.finalized_total_inventory,
				fc.finalized_st_percent,
				sfc.finalized_stack_st_percent,
				acc.actualized_st_percent,
				pmc.vendor_portal_status_id::integer,
				pmc.vendor_created_by::text,
				vum.name::text AS vendor_created_by_name,
				pmc.vendor_portal_status::text,
                pmc.created_at::date,
                pmc.updated_at::date,
                eac.event_attributes,
                ((eac.event_attributes->>''vendor_due_date'')::date - INTERVAL ''1 day'' * cv.submission_buffer_days)::date AS submission_due_date
		
		    FROM 
		        promo_master_details_cte pmc
		    LEFT JOIN 
		        promo_rules_cte prc ON pmc.promo_id = prc.promo_id
		    LEFT JOIN
		        override_reason_comment orcc ON pmc.promo_id = orcc.promo_id
		    LEFT JOIN 
		        finalized_cte fc ON pmc.promo_id = fc.promo_id
		    LEFT JOIN 
		        stacked_finalized_cte sfc ON pmc.promo_id = sfc.promo_id
		    LEFT JOIN 
		        ia_recc_cte iarc ON pmc.promo_id = iarc.promo_id
		    LEFT JOIN
		        original_cte oc ON pmc.promo_id = oc.promo_id
		    LEFT JOIN
		        stacked_original_cte soc ON pmc.promo_id = soc.promo_id
		    LEFT JOIN 
		        actualized_cte acc ON pmc.promo_id = acc.promo_id
            LEFT JOIN
                event_attributes_cte eac ON pmc.promo_id = eac.promo_id
			LEFT JOIN 
       		    global.user_master vum ON pmc.vendor_created_by = vum.user_code
		    LEFT JOIN 
		        global.user_master um ON pmc.created_by = um.user_code
			inner join
            	global.tb_currency_master tcm
            	on tcm.currency_id = (select target_currency_id from target_currency_cte)
			cross join
				config_values_cte cv
		    order by promo_id;', 
				request_payload->>'start_date', 
				request_payload->>'end_date', 
				request_payload->'product_hierarchies', 
				request_payload->'store_hierarchies', 
				request_payload->>'show_partially_overlapping_events', 
				strict_date_check, 
				COALESCE(request_payload->>'target_currency_id', NULL), 
				CASE 
	                WHEN request_payload->>'priority_numbers' IS NULL THEN 'NULL'
	                ELSE format('array%1$s::integer[]', request_payload->>'priority_numbers')
	            END,
                is_vendor_portal_request::text,
                p_user_id,
                (select array_agg(v::int) from jsonb_array_elements_text(request_payload->'event_ids') v)
                
        );

    END IF;
	
	raise notice 'final query - %', _query;

    -- Execute the final query
    RETURN QUERY EXECUTE _query;

END;
$function$
;
