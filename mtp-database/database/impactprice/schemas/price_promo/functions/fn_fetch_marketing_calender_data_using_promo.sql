--liquibase formatted sql
--changeset harsh.singh@impactanalytics.co:fn_fetch_marketing_calender_data_using_promo runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial_function_create for fn_fetch_marketing_calender_data_using_promo

DROP FUNCTION if exists price_promo.fn_fetch_marketing_calender_data_using_promo;

CREATE OR REPLACE FUNCTION price_promo.fn_fetch_marketing_calender_data_using_promo(request_payload jsonb, p_user_id integer)
 RETURNS TABLE(
    promo_id integer,
	promo_name text,
	start_date date,
	end_date date,
	event_id integer,
	event_name text,
	is_locked boolean,
	created_by text,
	offer_comment text,
	status_id integer,
	status text,
	timeline_status text,
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
	actual_performance text,
	finalized_performance text,
	actualized_contribution_margin numeric,
	actualized_contribution_margin_percent numeric,
	finalized_margin numeric,
	finalized_revenue numeric,
	finalized_discount text,
	finalized_promo_spend numeric,
	finalized_sales_units numeric,
	finalized_margin_percent numeric,
	finalized_contribution_margin numeric,
	finalized_contribution_revenue numeric,
	finalized_contribution_margin_percent numeric,
	finalized_baseline_contribution_margin numeric,
	finalized_incremental_contribution_margin numeric,
	finalized_baseline_contribution_margin_percent numeric,
	finalized_incremental_contribution_margin_percent numeric,
	ia_recc_discount text,
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
	finalized_stack_baseline_margin numeric,
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
	original_stack_margin numeric,
	original_stack_revenue numeric,
	original_stack_promo_spend numeric,
	original_stack_sales_units numeric,
	original_stack_margin_percent numeric,
	original_stack_contribution_margin numeric,
	original_stack_contribution_revenue numeric,
	original_stack_contribution_margin_percent numeric,
	finalized_incremental_sales_units numeric,
	finalized_incremental_revenue numeric,
	finalized_incremental_margin numeric,
	finalized_total_inventory integer,
	finalized_st_percent numeric,
	finalized_stack_st_percent numeric,
	actualized_st_percent numeric,
	actualized_promo_spend numeric,
	actualized_incremental_sales_units numeric,
	actualized_incremental_revenue numeric,
	actualized_incremental_margin numeric,
	actualized_margin numeric,
	actualized_revenue numeric,
	actualized_sales_units numeric,
	actualized_margin_percent numeric,
	actualized_contribution_revenue numeric,
	event_attributes jsonb,
	event_start_date date,
	event_end_date date
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    ids_where_str TEXT;
    filtered_promo_cte_query TEXT;
	strict_date_check TEXT;
	_query TEXT;
BEGIN

    -- If promo_ids or event_ids are present, apply filter logic
	
	strict_date_check := 
		format(
            CASE 
                WHEN request_payload->>'show_partially_overlapping_events' = 'true' AND
					request_payload->>'metrics_display_mode' = 'selected_date_range'
				THEN 
                    'WHERE original.recommendation_date <= TO_DATE(%L, ''YYYY/MM/DD'') 
                     AND original.recommendation_date >= TO_DATE(%L, ''YYYY/MM/DD'')'
                ELSE 
                    ''
            END,
            request_payload->>'end_date', request_payload->>'start_date'
        );

    IF (request_payload->>'promo_ids' IS NOT NULL  AND jsonb_array_length(request_payload->'promo_ids') > 0)
    then
        ids_where_str = format(
            'AND promo_id IN (%s)', 
            array_to_string(ARRAY(SELECT jsonb_array_elements_text(request_payload->'promo_ids')), ',')
        );

		

        filtered_promo_cte_query := format(
            'WITH final_eligible_promos_cte AS (
                SELECT promo_id
                FROM price_promo.promo_master
                WHERE is_deleted = 0
                and is_vendor_created_promo = false
                %s
            )', ids_where_str
        );


    ELSE


        -- Construct the filtered promo query using FILTER_BY_HIERARCHY_QUERY
        filtered_promo_cte_query := format(
            '
			WITH final_eligible_promos_cte AS (
				select
					promo_id
				from
					price_promo.promo_master
				where
					promo_id = any(array(select * from price_promo.fn_filter_promos(
						''%1$s'',
						''%2$s'',
						''%3$s'',
						''%4$s'',
						%7$L,
						%9$L::int[],
						%5$s,
						%6$s,
						false,
						''%8$s''
						)
			)))',
            request_payload->>'start_date', 
			request_payload->>'end_date', 
			request_payload->'product_hierarchies', 
			request_payload->'store_hierarchies', 
			request_payload->>'show_partially_overlapping_events',
			CASE 
                WHEN request_payload->>'priority_numbers' IS NULL THEN 'NULL'
                ELSE format('array%1$s::integer[]', request_payload->>'priority_numbers')
            END,
			p_user_id,
			request_payload->'customer_hierarchies',
            (select array_agg(v::int) from jsonb_array_elements_text(request_payload->'event_ids') v)
        );

    END IF;

	_query := format('
				    %1$s
					,target_currency_cte AS (
					    SELECT 
							fn_get_target_currency_id as target_currency_id  
						from 
							price_promo.fn_get_target_currency_id(
								(
									SELECT array_agg(DISTINCT currency_id) as source_currency_id
									FROM price_promo.ps_recommended_scenarios_agg 
									WHERE promo_id IN (
										SELECT promo_id FROM final_eligible_promos_cte
									)
								),
								%3$L::integer
						)
					),
				    override_reason_comment AS(
				        SELECT
				            tpof.promo_id,
				            tpof.is_default,
				            tpof.comment as override_comment,
				            tor.reason as override_reason
				        FROM
				            price_promo.tb_promo_override_forecast tpof
				        LEFT JOIN 
				            price_promo.tb_override_reason tor ON tpof.reason = tor.id
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
				            pmfc.name as promo_name,
				            pmfc.start_date,
				            pmfc.end_date,
				            em.event_id,
				            em.name as event_name,
				            em.is_locked,
				            pmfc.created_by,
				            pmfc.status as status_id,
				            STRING_AGG(psc.status_name::text, '', '') AS status,
				            CASE 
				                WHEN pmfc.end_date < CURRENT_DATE THEN ''Completed''
				                WHEN pmfc.start_date > CURRENT_DATE THEN ''Upcoming''
				                ELSE ''Ongoing''
				            END AS timeline_status,
							MAX(psrc.review_status)::text AS review_status,
				            pmfc.step_count,
				            pmfc.offer_comment,
				            pmfc.products_count,
				            pmfc.stores_count,
				            pmfc.product_selection_type as product_selection_type_id,
				            STRING_AGG(
				                CASE
				                    WHEN pstc.product_selection_sub_type::text IS NOT NULL THEN CONCAT(pstc.product_selection_type::text, ''-'', pstc.product_selection_sub_type::text)
				                    ELSE pstc.product_selection_type::text
				                END,
				                '', ''
				            ) AS product_selection_type,
				            pmfc.store_selection_type as store_selection_type_id,
				            STRING_AGG(
				                CASE
				                    WHEN sstc.store_selection_sub_type::text IS NOT NULL THEN CONCAT(sstc.store_selection_type::text, ''-'', sstc.store_selection_sub_type::text)
				                    ELSE sstc.store_selection_type::text
				                END,
				                '', ''
				            ) AS store_selection_type,
				            pmfc.exclusion_selection_type as exclusion_selection_type_id, 
				            case 
				            	when pmfc.exclusion_selection_type = 1 then ''hierarchy based exclusion ''
				            	when pmfc.exclusion_selection_type = 2 then ''product based exclusion ''
				            	when pmfc.exclusion_selection_type = 3 then ''product group based exclusion ''
				            	when pmfc.exclusion_selection_type = 4 then ''file upload based exclusion ''
				            end as exclusion_selection_type,
				            pmfc.customer_type as customer_type_id,
				            STRING_AGG(tctc.customer_type::text, '', '') AS customer_type,
				            pmfc.offer_distribution_channel as offer_distribution_channel_id,
				            STRING_AGG(todcc.channel::text, '', '') AS offer_distribution_channel,
				            pmfc.last_approved_scenario_id,
				            pmfc.recommendation_type_id,
				            STRING_AGG(tom.name, '', '') AS recommendation_type,
				            pmfc.is_under_processing,
				            pmfc.is_auto_resimulated,
				            pmfc.is_overridden_scenario_finalized,
				            em.start_date as event_start_date,
				            em.end_date as event_end_date
				        FROM
				            final_eligible_promos_cte fep
				        JOIN
				            price_promo.promo_master pmfc ON fep.promo_id = pmfc.promo_id
				        left join
				            price_promo.event_master em on pmfc.event_id = em.event_id
				        LEFT JOIN
				            price_promo.promo_status_config psc ON pmfc.status = psc.status_id
				        LEFT JOIN
				            price_promo.product_selection_type_config pstc ON pmfc.product_selection_type = pstc.id
				        LEFT JOIN
				            price_promo.store_selection_type_config sstc ON pmfc.store_selection_type = sstc.id
				        LEFT JOIN
				            price_promo.tb_customer_type_config tctc ON pmfc.customer_type = tctc.id
				        LEFT JOIN
				            price_promo.tb_offer_distributor_channel_config todcc ON pmfc.offer_distribution_channel = todcc.id
				        LEFT JOIN 
				            price_promo.tb_offer_master tom ON pmfc.recommendation_type_id = tom.id
						LEFT JOIN 
							price_promo.promo_status_review_config psrc ON psrc.id = pmfc.review_status
				        GROUP BY
				            pmfc.promo_id, pmfc.name, pmfc.start_date, pmfc.end_date, em.event_id, em.name, em.is_locked, pmfc.created_by, pmfc.status, pmfc.step_count,
				            pmfc.offer_comment, pmfc.products_count, pmfc.stores_count, pmfc.product_selection_type, pmfc.store_selection_type, pmfc.exclusion_selection_type, 
				            pmfc.customer_type, pmfc.offer_distribution_channel, pmfc.last_approved_scenario_id,
				            pmfc.recommendation_type_id, pmfc.is_under_processing, pmfc.is_auto_resimulated, pmfc.is_overridden_scenario_finalized, pmfc.review_status,
				            em.start_date, em.end_date
				    ),
				    promo_rules_cte AS (
                        select
                            pr.promo_id,
				            max(pr.discount_level) AS discount_level_id,
				            string_agg(dlc.discount_level_value, '','') AS discount_level,
                            max(pr.discount_type) as discount_type,
                            max(tom.display_name) as display_discount_type
				        FROM
				            price_promo.ps_rules pr
				        LEFT JOIN
				            price_promo.discount_level_config dlc ON dlc.discount_level_id = any(pr.product_discount_level)
				        LEFT JOIN
                            price_promo.tb_offer_master tom ON pr.discount_type_id = tom.id
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
				            case when fe.is_default then ROUND(SUM(sales_units)::DECIMAL, 2) else null end AS original_sales_units,
				            case when fe.is_default then ROUND(SUM(revenue * pfr.planned_conversion_multiplier)::DECIMAL, 2) else null end AS original_revenue,
				            case when fe.is_default then ROUND(SUM(margin * pfr.planned_conversion_multiplier)::DECIMAL, 2) else null end AS original_margin,
				            case when fe.is_default then ROUND(SUM(promo_spend * pfr.planned_conversion_multiplier)::DECIMAL, 2) else null end AS original_promo_spend,
				            case when fe.is_default then ROUND((SUM(margin) * 100 / NULLIF(SUM(revenue), 0))::NUMERIC, 2) else null end AS original_margin_percent,
				            case when fe.is_default then ROUND(SUM(contribution_revenue * pfr.planned_conversion_multiplier)::DECIMAL, 2) else null end AS original_contribution_revenue,
				            case when fe.is_default then ROUND(SUM(contribution_margin * pfr.planned_conversion_multiplier)::DECIMAL, 2) else null end AS original_contribution_margin,
				            case when fe.is_default then ROUND((SUM(contribution_margin) * 100 / NULLIF(SUM(contribution_revenue), 0))::NUMERIC, 2) else null end AS original_contribution_margin_percent,
				            case when fe.is_default then MIN(offer_type_combined_display_name) else null end AS original_discount,
				            case when fe.is_default then ROUND((SUM(incremental_margin) / NULLIF(ABS(SUM(baseline_margin)), 0))::DECIMAL * 100::DECIMAL, 2) else null end AS original_performance
				        FROM
				            finalized_scenarios_cte fe 
				        INNER JOIN
				            price_promo.ps_recommended_finalized_agg pa using(promo_id)
						inner join 
		                    pricesmart.planned_forex_rate pfr 
		                    on 
		                        pa.recommendation_date = pfr.date 
		                        and pfr.source_currency_id = pa.currency_id
		                        and pfr.target_currency_id = (SELECT target_currency_id FROM target_currency_cte)
				        GROUP BY
				            fe.promo_id,fe.is_default
				    ),
				    stacked_original_cte AS (
				        SELECT
				            fe.promo_id,
				            case when fe.is_default then ROUND(SUM(sales_units)::DECIMAL, 2) else null end AS original_stack_sales_units,
				            case when fe.is_default then ROUND(SUM(revenue * pfr.planned_conversion_multiplier)::DECIMAL, 2) else null end AS original_stack_revenue,
				            case when fe.is_default then ROUND(SUM(margin * pfr.planned_conversion_multiplier)::DECIMAL, 2) else null end AS original_stack_margin,
				            case when fe.is_default then ROUND(SUM(promo_spend * pfr.planned_conversion_multiplier)::DECIMAL, 2) else null end AS original_stack_promo_spend,
				            case when fe.is_default then ROUND((SUM(margin) * 100 / NULLIF(SUM(revenue), 0))::NUMERIC, 2) else null end AS original_stack_margin_percent,
				            case when fe.is_default then ROUND(SUM(contribution_revenue * pfr.planned_conversion_multiplier)::DECIMAL, 2) else null end AS original_stack_contribution_revenue,
				            case when fe.is_default then ROUND(SUM(contribution_margin * pfr.planned_conversion_multiplier)::DECIMAL, 2) else null end AS original_stack_contribution_margin,
				            case when fe.is_default then ROUND((SUM(contribution_margin) * 100 / NULLIF(SUM(contribution_revenue), 0))::NUMERIC, 2) else null end AS original_stack_contribution_margin_percent,
				            case when fe.is_default then ROUND((SUM(incremental_margin) / NULLIF(ABS(SUM(baseline_margin)), 0))::DECIMAL * 100::DECIMAL, 2) else null end AS original_stack_performance
				        FROM
				            price_promo.ps_recommended_finalized_stack_agg pa
				        INNER JOIN
				            finalized_scenarios_cte fe ON fe.promo_id = any(pa.promo_ids)
						inner join 
		                    pricesmart.planned_forex_rate pfr 
		                    on 
		                        pa.recommendation_date = pfr.date 
		                        and pfr.source_currency_id = pa.currency_id
		                        and pfr.target_currency_id = (SELECT target_currency_id FROM target_currency_cte)
				        GROUP BY
				            fe.promo_id,fe.is_default
				    ),
				    finalized_cte AS (
				        SELECT
				            sfsc.promo_id,
				            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.sales_units) ELSE SUM(original.sales_units) END::DECIMAL, 2) AS finalized_sales_units,
				            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.baseline_sales_units) ELSE SUM(original.baseline_sales_units) END::DECIMAL, 2) AS finalized_baseline_sales_units,
				            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.incremental_sales_units) ELSE SUM(original.incremental_sales_units) END::DECIMAL, 2) AS finalized_incremental_sales_units,
				            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.revenue * pfr.planned_conversion_multiplier) ELSE SUM(original.revenue * pfr.planned_conversion_multiplier) END::DECIMAL, 2) AS finalized_revenue,
				            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.baseline_revenue * pfr.planned_conversion_multiplier) ELSE SUM(original.baseline_revenue * pfr.planned_conversion_multiplier) END::DECIMAL, 2) AS finalized_baseline_revenue,
				            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.incremental_revenue * pfr.planned_conversion_multiplier) ELSE SUM(original.incremental_revenue * pfr.planned_conversion_multiplier) END::DECIMAL, 2) AS finalized_incremental_revenue,
				            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.margin * pfr.planned_conversion_multiplier) ELSE SUM(original.margin * pfr.planned_conversion_multiplier) END::DECIMAL, 2) AS finalized_margin,
				            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.baseline_margin * pfr.planned_conversion_multiplier) ELSE SUM(original.baseline_margin * pfr.planned_conversion_multiplier) END::DECIMAL, 2) AS finalized_baseline_margin,
				            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.incremental_margin * pfr.planned_conversion_multiplier) ELSE SUM(original.incremental_margin * pfr.planned_conversion_multiplier) END::DECIMAL, 2) AS finalized_incremental_margin,
				            ROUND((CASE WHEN sfsc.is_default 
				                        THEN (SUM(override.margin) * 100 / NULLIF(SUM(override.revenue), 0))
				                        ELSE (SUM(original.margin) * 100 / NULLIF(SUM(original.revenue), 0)) END)::NUMERIC, 2) AS finalized_margin_percent,
				            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.promo_spend * pfr.planned_conversion_multiplier) ELSE SUM(original.promo_spend * pfr.planned_conversion_multiplier) END::DECIMAL, 2) AS finalized_promo_spend,
				            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.contribution_revenue * pfr.planned_conversion_multiplier) ELSE SUM(original.contribution_revenue * pfr.planned_conversion_multiplier) END::DECIMAL, 2) AS finalized_contribution_revenue,
				            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.contribution_margin * pfr.planned_conversion_multiplier) ELSE SUM(original.contribution_margin * pfr.planned_conversion_multiplier) END::DECIMAL, 2) AS finalized_contribution_margin,
				            ROUND((CASE WHEN sfsc.is_default 
				                        THEN (SUM(override.contribution_margin) * 100 / NULLIF(SUM(override.contribution_revenue), 0))
				                        ELSE (SUM(original.contribution_margin) * 100 / NULLIF(SUM(original.contribution_revenue), 0)) END)::NUMERIC, 2) AS finalized_contribution_margin_percent,
				            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.baseline_margin * pfr.planned_conversion_multiplier) ELSE SUM(original.baseline_margin * pfr.planned_conversion_multiplier) END::DECIMAL, 2) AS finalized_baseline_contribution_margin,
				            ROUND(CASE WHEN sfsc.is_default = TRUE 
				                        THEN (SUM(override.contribution_margin * pfr.planned_conversion_multiplier) - SUM(override.baseline_margin * pfr.planned_conversion_multiplier))
				                        ELSE (SUM(original.contribution_margin * pfr.planned_conversion_multiplier) - SUM(original.baseline_margin * pfr.planned_conversion_multiplier)) END::DECIMAL, 2) AS finalized_incremental_contribution_margin,
				            ROUND((CASE WHEN sfsc.is_default 
				                        THEN (SUM(override.baseline_margin) * 100 / NULLIF(SUM(override.baseline_revenue), 0))
				                        ELSE (SUM(original.baseline_margin) * 100 / NULLIF(SUM(original.baseline_revenue), 0)) END)::NUMERIC, 2) AS finalized_baseline_contribution_margin_percent,
				            ROUND((CASE WHEN sfsc.is_default 
				                        THEN ((SUM(override.contribution_margin) - SUM(override.baseline_margin)) * 100 / NULLIF(SUM(override.contribution_revenue), 0))
				                        ELSE ((SUM(original.contribution_margin) - SUM(original.baseline_margin)) * 100 / NULLIF(SUM(original.contribution_revenue), 0)) END)::NUMERIC, 2) AS finalized_incremental_contribution_margin_percent,
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
		                    pricesmart.planned_forex_rate pfr 
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
				            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.revenue) ELSE SUM(original.revenue) END::DECIMAL, 2) AS finalized_stack_revenue,
				            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.baseline_revenue) ELSE SUM(original.baseline_revenue) END::DECIMAL, 2) AS finalized_stack_baseline_revenue,
				            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.margin) ELSE SUM(original.margin) END::DECIMAL, 2) AS finalized_stack_margin,
				            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.baseline_margin) ELSE SUM(original.baseline_margin) END::DECIMAL, 2) AS finalized_stack_baseline_margin,
				            CASE 
				                WHEN sfsc.is_default 
				                THEN ROUND((SUM(override.margin) * 100 / NULLIF(SUM(override.revenue), 0))::NUMERIC, 2)
				                ELSE ROUND((SUM(original.margin) * 100 / NULLIF(SUM(original.revenue), 0))::NUMERIC, 2)
				            END AS finalized_stack_margin_percent,
				            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.promo_spend) ELSE SUM(original.promo_spend) END::DECIMAL, 2) AS finalized_stack_promo_spend,
				            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.contribution_revenue) ELSE SUM(original.contribution_revenue) END::DECIMAL, 2) AS finalized_stack_contribution_revenue,
				            ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.contribution_margin) ELSE SUM(original.contribution_margin) END::DECIMAL, 2) AS finalized_stack_contribution_margin,
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
							ELSE ROUND(((ROUND(CASE WHEN sfsc.is_default = TRUE THEN SUM(override.sales_units) ELSE SUM(original.sales_units) END::DECIMAL, 2) / MAX(sfsc.total_inventory)) * 100)::DECIMAL, 1) 
							END)) AS finalized_stack_st_percent
				        FROM
				            finalized_scenarios_cte sfsc
				        LEFT JOIN 
				            price_promo.ps_recommended_finalized_stack_agg original ON sfsc.promo_id = ANY(original.promo_ids)
				        LEFT JOIN 
				            price_promo.ps_recommended_finalized_stack_override_agg override ON original.promo_ids = override.promo_ids and original.recommendation_date = override.recommendation_date
						inner join 
		                    pricesmart.planned_forex_rate pfr 
		                    on 
		                        original.recommendation_date = pfr.date 
		                        and pfr.source_currency_id = original.currency_id
		                        and pfr.target_currency_id = (SELECT target_currency_id FROM target_currency_cte)
				        %2$s
						GROUP BY 
				            sfsc.promo_id,
				            sfsc.is_default
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
							MAX(sfsc.total_inventory) as actualized_total_inventory,
							LEAST(100, GREATEST(0, CASE 
							WHEN COALESCE(MAX(sfsc.total_inventory), 0) = 0 THEN 0 
							ELSE ROUND(((ROUND(SUM(sales_units)::DECIMAL, 2) / MAX(sfsc.total_inventory)) * 100)::DECIMAL, 1) 
							END)) AS actualized_st_percent
				        FROM
				            price_promo.ps_recommended_actuals_agg praa
						LEFT JOIN finalized_scenarios_cte sfsc ON praa.promo_id = sfsc.promo_id
						inner join 
		                    pricesmart.actual_forex_rate afr 
		                    on 
		                        praa.recommendation_date = afr.date 
		                        and afr.source_currency_id = praa.currency_id
		                        and afr.target_currency_id = (SELECT target_currency_id FROM target_currency_cte)
						WHERE
				            praa.promo_id IN (SELECT promo_id FROM final_eligible_promos_cte)
				        GROUP BY
				            praa.promo_id
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
				        pmc.offer_comment,
				        pmc.status_id::integer as status_id,
				        pmc.status,
				        pmc.timeline_status,
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
				        (pmc.is_under_processing::int)::smallint AS is_under_processing,
				        (pmc.is_auto_resimulated::int)::smallint AS is_auto_resimulated,
				        case when orcc.is_default then 1 else 0 end as is_overridden,
				        orcc.override_comment,
				        orcc.override_reason,
						tcm.currency_id,
						tcm.currency_symbol::text as currency_symbol,
						tcm.currency_name::text as currency_name,
				        prc.discount_level_id,
				        prc.discount_level::text as discount_level,
				        prc.display_discount_type::text as discount_type,
				        CASE 
						    WHEN acc.performance IS NULL THEN NULL 
						    ELSE price_promo.fn_get_performance_repr(acc.performance) 
						END AS actual_performance,
						CASE 
						    WHEN sfc.finalized_stack_performance IS NULL THEN NULL 
						    ELSE price_promo.fn_get_performance_repr(sfc.finalized_stack_performance) 
						END AS finalized_performance,
						acc.actualized_contribution_margin,
						acc.actualized_contribution_margin_percent,
				        fc.finalized_margin,
				        fc.finalized_revenue,
				        fc.finalized_discount,
				        fc.finalized_promo_spend,
				        fc.finalized_sales_units,
				        fc.finalized_margin_percent,
				        fc.finalized_contribution_margin,
				        fc.finalized_contribution_revenue,
				        fc.finalized_contribution_margin_percent,
				        fc.finalized_baseline_contribution_margin,
				        fc.finalized_incremental_contribution_margin,
				        fc.finalized_baseline_contribution_margin_percent,
				        fc.finalized_incremental_contribution_margin_percent,
				        iarc.ia_recc_discount,
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
				        sfc.finalized_stack_baseline_margin,
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
				        soc.original_stack_margin,
				        soc.original_stack_revenue,
				        soc.original_stack_promo_spend,
				        soc.original_stack_sales_units,
				        soc.original_stack_margin_percent,
				        soc.original_stack_contribution_margin,
				        soc.original_stack_contribution_revenue,
				        soc.original_stack_contribution_margin_percent,
				        fc.finalized_incremental_sales_units,
				        fc.finalized_incremental_revenue,
				        fc.finalized_incremental_margin,

						fc.finalized_total_inventory,
						fc.finalized_st_percent,
						sfc.finalized_stack_st_percent,
						acc.actualized_st_percent,
						acc.actualized_promo_spend,
						acc.actualized_incremental_sales_units,
						acc.actualized_incremental_revenue,
						acc.actualized_incremental_margin,
						acc.actualized_margin,
						acc.actualized_revenue,
						acc.actualized_sales_units,
						acc.actualized_margin_percent,
                        acc.actualized_contribution_revenue,
                        eac.event_attributes,
                        pmc.event_start_date,
                        pmc.event_end_date

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
				        actualized_cte acc ON pmc.promo_id = acc.promo_id
				    LEFT JOIN
				        ia_recc_cte iarc ON pmc.promo_id = iarc.promo_id
				    LEFT JOIN
				        original_cte oc ON pmc.promo_id = oc.promo_id 
				    LEFT JOIN
				        stacked_original_cte soc ON pmc.promo_id = soc.promo_id
				    LEFT JOIN
                        event_attributes_cte eac ON pmc.promo_id = eac.promo_id
				    LEFT JOIN 
				        global.user_master um ON pmc.created_by = um.user_code
					inner join
						pricesmart.tb_currency_master tcm
						on tcm.currency_id = (select target_currency_id from target_currency_cte)
				    ORDER BY promo_id;
			',filtered_promo_cte_query, strict_date_check, COALESCE(request_payload->>'target_currency_id', NULL));

    raise notice 'query - %', _query;

    -- Execute the final query
    RETURN QUERY EXECUTE _query;

END;
$function$
;
