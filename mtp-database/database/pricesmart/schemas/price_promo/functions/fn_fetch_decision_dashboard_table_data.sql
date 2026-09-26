--liquibase formatted sql
--changeset chaudhari.shruti@impactanalytics.co:fetch_decision_dashboard_table_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: products, stores count updated for event & promo - fn_fetch_decision_dashboard_table_data

DROP FUNCTION if exists price_promo.fn_fetch_decision_dashboard_table_data;

CREATE OR REPLACE FUNCTION price_promo.fn_fetch_decision_dashboard_table_data(request_payload jsonb, is_download boolean)
 RETURNS TABLE(
    promo_id integer,
     promo_name text,
     start_date date,
     end_date date,
     event_id integer,
     event_name text,
     product_master_data jsonb,
     store_master_data jsonb,
     is_locked boolean,
     created_by text,
     offer_comment text,
     status_id integer,
     status text,
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
     currency_id integer,
     currency_symbol text,
     currency_name text,
     is_overridden integer,
     override_comment text,
     override_reason text,
     discount_level_id integer,
     discount_level text,
     actual_performance text,
     finalized_performance text,
     revenue_per_style numeric,
     no_of_txn double precision,
     units_per_txn double precision,
     avg_basket_size double precision,
     actualized_promo_spend numeric,
     finalized_margin numeric,
     finalized_revenue numeric,
     finalized_discount text,
     finalized_promo_spend numeric,
     finalized_sales_units numeric,
     finalized_margin_percent numeric,
     finalized_contribution_margin numeric,
     finalized_contribution_revenue numeric,
     finalized_baseline_sales_units numeric,
     finalized_baseline_revenue numeric,
     finalized_baseline_margin numeric,
     finalized_contribution_margin_percent numeric,
     ia_recc_discount text,
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
     actualized_incremental_sales_units numeric,
     actualized_incremental_revenue numeric,
     actualized_incremental_margin numeric,
     actualized_margin numeric,
     actualized_revenue numeric,
     actualized_sales_units numeric,
     actualized_margin_percent numeric,
     actualized_contribution_margin numeric,
     actualized_contribution_revenue numeric,
     actualized_contribution_margin_percent numeric,
     finalized_stack_incremental_sales_units numeric,
     finalized_stack_incremental_revenue numeric,
     finalized_stack_incremental_margin numeric,
     finalized_total_inventory integer,
     finalized_st_percent numeric,
     finalized_stack_st_percent numeric,
     actualized_st_percent numeric
)
 LANGUAGE plpgsql
AS $function$
DECLARE
    ids_where_str text;
    filtered_promo_cte_query text;
	_query text := '';
	aggregation_constraint text;
	non_aggregation_constraint text;
	group_by_str text;
	join_str text;
	strict_date_check text;
	json_product_columns text := '';
	json_store_columns text := '';
	_product_hierarchies_config jsonb;
	_store_hierarchies_config jsonb;

	product_column_names_mapping jsonb;

	store_column_names_mapping jsonb;

	product_columns TEXT := '';
    product_hierarchy_levels jsonb := request_payload->'aggregation'->'product_hierarchy_levels';
	selected_product_columns text;
    selected_product_columns_array text[];

	store_columns TEXT := '';
    store_hierarchy_levels jsonb := request_payload->'aggregation'->'store_hierarchy_levels';
	selected_store_columns text;
    selected_store_columns_array text[];

	is_product_overall BOOLEAN := FALSE;
	is_store_overall BOOLEAN := FALSE;
	agg_table text := '';

	aggregation_list JSONB;
	has_promo_id BOOLEAN;
	has_event_id BOOLEAN;
	time_based_selections_str text;
	time_based_selections text;
	final_promo_ids integer[];
	finalized_stacked_cte_join_1 text := ' fepc.promo_id = any(fa.promo_ids) ';
	finalized_stacked_cte_join_2 text := ' fa.promo_ids = foa.promo_ids and ';
	other_cte_where_condition text;
	final_join text;
	final_order_by text;
	promo_cte_join text;
	promo_name_selection text := 'pmc.promo_id,
		        pmc.promo_name::text AS promo_name,
		        pmc.start_date,
		        pmc.end_date,
		        pmc.event_id, 
		        pmc.event_name::text as event_name';

	promo_cte_date_selection text := 'pmfc.start_date,
                    				pmfc.end_date,';

	promo_cte_other_selections text := 'pmfc.promo_id,
						            pmfc.name as promo_name,
						            em.event_id, 
						            em.name as event_name, 
						            em.is_locked,
						            pmfc.created_by,
						            pmfc.status as status_id,
						            STRING_AGG(distinct psc.status_name::text, '', '') AS status,
						            pmfc.step_count,
						            pmfc.offer_comment,
						            COALESCE(pmfc.products_count,0) as products_count,
									COALESCE(pmfc.stores_count,0) as stores_count,
						            pmfc.product_selection_type as product_selection_type_id,
						            STRING_AGG(
						                distinct CASE
						                    WHEN pstc.product_selection_sub_type::text IS NOT NULL THEN CONCAT(pstc.product_selection_type::text, ''-'', pstc.product_selection_sub_type::text)
						                    ELSE pstc.product_selection_type::text
						                END,
						                '', ''
						            ) AS product_selection_type,
						            pmfc.store_selection_type as store_selection_type_id,
						            STRING_AGG(
						                distinct CASE
						                    WHEN sstc.store_selection_sub_type::text IS NOT NULL THEN CONCAT(sstc.store_selection_type::text, ''-'', sstc.store_selection_sub_type::text)
						                    ELSE sstc.store_selection_type::text
						                END,
						                '', ''
						            ) AS store_selection_type,
						            pmfc.exclusion_selection_type as exclusion_selection_type_id, 
						            CASE 
						                WHEN pmfc.exclusion_selection_type = 1 THEN ''hierarchy based exclusion ''
						                WHEN pmfc.exclusion_selection_type = 2 THEN ''product based exclusion ''
						                WHEN pmfc.exclusion_selection_type = 3 THEN ''product group based exclusion ''
						                WHEN pmfc.exclusion_selection_type = 4 THEN ''file upload based exclusion ''
						            END AS exclusion_selection_type,
						            pmfc.customer_type as customer_type_id,
						            STRING_AGG(distinct tctc.customer_type::text, '', '') AS customer_type,
						            pmfc.offer_distribution_channel as offer_distribution_channel_id,
						            STRING_AGG(distinct todcc.channel::text, '', '') AS offer_distribution_channel,
						            pmfc.last_approved_scenario_id,
						            pmfc.recommendation_type_id,
						            STRING_AGG(distinct tasm.name, '', '') AS recommendation_type,
						            pmfc.is_under_processing,
						            pmfc.is_auto_resimulated,
						            pmfc.is_overridden_scenario_finalized';

	promo_cte_group_by text := 'pmfc.promo_id, pmfc.name, pmfc.start_date, pmfc.end_date, em.event_id, 
		            em.name, em.is_locked, pmfc.created_by, pmfc.status, 
		            pmfc.step_count, pmfc.offer_comment, pmfc.products_count, pmfc.stores_count, 
		            pmfc.product_selection_type, pmfc.store_selection_type, pmfc.exclusion_selection_type, 
		            pmfc.customer_type, pmfc.offer_distribution_channel, pmfc.last_approved_scenario_id, 
		            pmfc.recommendation_type_id, pmfc.is_under_processing, pmfc.is_auto_resimulated, pmfc.is_overridden_scenario_finalized';
	
	promo_cte_timeline_group_by text := '';

	aggregation_name text = 'promo';

	final_select_other_columns text := 'case when orcc.is_default = true then 1 else 0 end as is_overridden,
		        orcc.override_comment,
		        orcc.override_reason,
		        prc.discount_level_id,
		        prc.discount_level::text as discount_level,';

    _i record;

	
BEGIN
	
	select config_value::jsonb into _product_hierarchies_config 
	from price_promo.tb_tool_configurations
	where module = 'product' and config_name = 'hierarchy_filters';

	select config_value::jsonb into _store_hierarchies_config
	from price_promo.tb_tool_configurations
	where module = 'store' and config_name = 'hierarchy_filters';

	product_column_names_mapping = (
		select jsonb_object_agg(
			value->>'id', value->>'value_column'
		)
		from jsonb_each(_product_hierarchies_config)
		where (value->>'is_linked_to_downloads')::bool = true
	);

    raise notice 'product column names mapping - %', product_column_names_mapping;

	store_column_names_mapping := (
		select jsonb_object_agg(
			value->>'id', value->>'value_column'
		)
		from jsonb_each(_store_hierarchies_config)
		where (value->>'is_linked_to_downloads')::bool = true
	);

    raise notice 'store column names mapping - %', store_column_names_mapping;

    for _i in select * from jsonb_each(_product_hierarchies_config)
    loop 
        raise notice 'key - %', _i.key;
        raise notice 'value - %', _i.value;
        if not ((_i.value->>'is_linked_to_downloads')::bool is true) then
            continue;
        end if;
        selected_product_columns_array := array_append(
            selected_product_columns_array,
            format('''%1$s'',null::text', _i.value->>'value_column')
        );
    end loop;

    selected_product_columns = format(
        'jsonb_build_object(%1$s)',
        array_to_string(selected_product_columns_array, ',')
    );

    raise notice 'selected product columns - %', selected_product_columns;

    for _i in select * from jsonb_each(_store_hierarchies_config)
    loop 
        if not ((_i.value->>'is_linked_to_downloads')::bool is true) then
            continue;
        end if;

        selected_store_columns_array := array_append(
            selected_store_columns_array,
            format('''%1$s'',null::text', _i.value->>'value_column')
        );
    end loop;

    selected_store_columns = format(
        'jsonb_build_object(%1$s)',
        array_to_string(selected_store_columns_array, ',')
    );

    raise notice 'selected store columns - %', selected_store_columns;

	raise notice 'type- %', pg_typeof(request_payload->'promo_ids');

	aggregation_list := request_payload->'aggregation'->'marketing';

	has_promo_id := aggregation_list = '[]'::jsonb OR aggregation_list @> '["promo_id"]'::jsonb;
	has_event_id := aggregation_list @> '["event_id"]'::jsonb;

	aggregation_constraint := 
    CASE 
        WHEN has_promo_id THEN 'promo_id'
        ELSE 'event_id'
    END;

	final_order_by := aggregation_constraint;

	RAISE NOTICE 'aggregation_constraint - %', aggregation_constraint;
	
	non_aggregation_constraint := 
	    CASE 
	        WHEN has_promo_id THEN 'event_id'
	        ELSE 'promo_id'
	    END;
	
	RAISE NOTICE 'non_aggregation_constraint - %', non_aggregation_constraint;

    group_by_str := 
	    CASE 
	        WHEN (request_payload->'aggregation'->>'timeline')::int = 0 THEN ' , tfdm.date, tfdm.fiscal_week , tfdm.fiscal_year ' 
	        WHEN (request_payload->'aggregation'->>'timeline')::int = 1 THEN ' , tfdm.fiscal_week , tfdm.fiscal_year' 
	        ELSE ' ' 
	    END;

	raise notice 'group_by_str - %',group_by_str;

    join_str := 
        CASE 
            WHEN (request_payload->'aggregation'->>'timeline')::int != -200 THEN 
                'inner JOIN global.tb_fiscal_date_mapping tfdm ON tfdm.date = fa.recommendation_date ' 
            ELSE ' ' 
        END;

	time_based_selections_str := 
        CASE 
            WHEN (request_payload->'aggregation'->>'timeline')::int != -200 THEN 
                ', tfdm.fiscal_week , tfdm.fiscal_year ' 
            ELSE ' ' 
        END;

	time_based_selections := 
		CASE 
            WHEN (request_payload->'aggregation'->>'timeline')::int != -200 THEN 
                ', fiscal_week , fiscal_year ' 
            ELSE ' ' 
        END;

	raise notice 'join_str - %',join_str;

	IF jsonb_typeof(product_hierarchy_levels) = 'array' AND jsonb_array_length(product_hierarchy_levels) > 0 THEN
	    -- Check if the array contains only -200
	    IF product_hierarchy_levels = '[ -200 ]'::jsonb THEN
            is_product_overall := TRUE;
        ELSE
            SELECT ', ' || string_agg(product_column_names_mapping->>value, ', ') 
            INTO product_columns
            FROM jsonb_array_elements_text(product_hierarchy_levels);

	        -- Generate product_columns (comma-separated mapped column names)
	        SELECT 
			    array_agg(
			        CASE 
			            WHEN selected_levels.value IS NOT NULL 
			            THEN format(
                                '''%1$s'',COALESCE(fc.%1$s, fsc.%1$s, iarc.%1$s, acc.%1$s)',
                                product_column_names_mapping->>all_levels.value
                            )
			            ELSE format(
                                '''%1$s'',NULL::TEXT',
                                product_column_names_mapping->>all_levels.value
                            )
			        END
			    ) INTO selected_product_columns_array
			FROM jsonb_array_elements_text(
                (
                    select jsonb_agg(value->>'id') 
                    from jsonb_each(_product_hierarchies_config) 
                    where (value->>'is_linked_to_downloads')::bool = true
                )
            ) AS all_levels
			LEFT JOIN jsonb_array_elements_text(product_hierarchy_levels) AS selected_levels
			ON all_levels.value = selected_levels.value;

            selected_product_columns = format(
                'jsonb_build_object(%1$s)',
                array_to_string(selected_product_columns_array, ',')
            );
	    END IF;
	ELSE
	    product_columns := '';
	END IF;

    raise notice 'product columns - %', product_columns;
    raise notice 'selected product columns - %', selected_product_columns;

	IF jsonb_typeof(store_hierarchy_levels) = 'array' AND jsonb_array_length(store_hierarchy_levels) > 0 THEN
	    -- Check if the array contains only -200
	    IF store_hierarchy_levels = '[-200]'::jsonb THEN
	        is_store_overall := TRUE;
	    ELSE
	        -- Generate store_columns (comma-separated mapped column names)
	        SELECT ', ' || string_agg(store_column_names_mapping->>selected.value, ', ')
	        INTO store_columns 
	        FROM jsonb_array_elements_text(store_hierarchy_levels) AS selected;

		    SELECT 
		        array_agg(
		            CASE 
		                WHEN selected_levels.value IS NOT NULL 
		                THEN format(
                            '''%1$s'',COALESCE(fc.%1$s::text, fsc.%1$s::text, iarc.%1$s::text, acc.%1$s::text)',
                            store_column_names_mapping->>all_levels.value
                        )
		                ELSE format(
                            '''%1$s'',NULL::TEXT',
                            store_column_names_mapping->>all_levels.value
                        )
		            END
		        ) into selected_store_columns_array
		    FROM jsonb_array_elements_text(
                (
                    select jsonb_agg(value->>'id') 
                    from jsonb_each(_store_hierarchies_config) 
                    where (value->>'is_linked_to_downloads')::bool = true
                )
            ) AS all_levels
		    LEFT JOIN jsonb_array_elements_text(store_hierarchy_levels) AS selected_levels
		    ON all_levels.value = selected_levels.value;

            selected_store_columns = format(
                'jsonb_build_object(%1$s)',
                array_to_string(selected_store_columns_array, ',')
            );
	    END IF;
	ELSE
	    store_columns := '';
	END IF;

    raise notice 'store columns - %', store_columns;
    raise notice 'selected store columns - %', selected_store_columns;

	if is_download is false or (is_product_overall and is_store_overall) then 
		agg_table := '_agg';
	else 
		join_str = join_str || ' inner JOIN 
			price_promo.product_master pm 
		ON fa.product_id = pm.product_id 
		inner JOIN
			global.tb_store_master tsm
		on fa.store_id = tsm.store_id
		';

	end if;

    -- Handle promo_id and event_id filters
    IF (request_payload->>'promo_ids' IS NOT NULL 
	    AND jsonb_array_length(request_payload->'promo_ids') > 0)
	   OR (request_payload->>'event_ids' IS NOT NULL 
	    AND jsonb_array_length(request_payload->'event_ids') > 0) THEN

        ids_where_str := CASE 
            WHEN (request_payload->>'promo_ids' IS NOT NULL 
	    		AND jsonb_array_length(request_payload->'promo_ids') > 0) THEN 
                format('AND promo_id IN (%s)', array_to_string(ARRAY(SELECT jsonb_array_elements_text(request_payload->'promo_ids')), ','))
            ELSE 
                format('AND event_id IN (%s)', array_to_string(ARRAY(SELECT jsonb_array_elements_text(request_payload->'event_ids')), ','))
        END;

        filtered_promo_cte_query := format(
            'WITH final_eligible_promos_cte AS (
                SELECT promo_id, event_id, total_inventory
                FROM price_promo.promo_master
                WHERE is_deleted = 0
                AND status IN (-1, 4, 8)
                %s
            )', ids_where_str
        );

    ELSE

        -- Build filtered_promo_cte_query
        filtered_promo_cte_query := format(
            '
			WITH final_eligible_promos_cte AS (
				select
					promo_id, event_id, total_inventory
				from
					price_promo.promo_master
				where
					promo_id = any(array(select * from price_promo.fn_filter_promos(
						''%1$s'',
						''%2$s'',
						''%3$s'',
						''%4$s'',
						null,
						%5$s
					)))
					AND status IN (-1, 4, 8)
			)
			',
            request_payload->>'start_date', 
			request_payload->>'end_date', 
			request_payload->'product_hierarchies', 
			request_payload->'store_hierarchies', 
			request_payload->>'show_partially_overlapping_events'
        );

        raise notice 'filtered promo cte query - %', filtered_promo_cte_query;

    END IF;

	if not (is_download is false or (is_product_overall and is_store_overall)) then
		_query := format('
			%1$s
			select array_agg(promo_id) from final_eligible_promos_cte
		', filtered_promo_cte_query);

        raise notice 'promo ids query - %', _query;

		execute _query into final_promo_ids;
		raise notice '%', final_promo_ids;

		

		other_cte_where_condition := CASE 
		    WHEN final_promo_ids IS NOT NULL AND array_length(final_promo_ids, 1) > 0 
		    THEN array_to_string(final_promo_ids, ',')
		    ELSE 'select promo_id from final_eligible_promos_cte'
		END;

	else

		other_cte_where_condition := 'select promo_id from final_eligible_promos_cte';

	end if;

    raise notice 'other cte where condition - %', other_cte_where_condition;

	if aggregation_constraint = 'event_id' then  

		promo_cte_other_selections = '
						            em.event_id, 
						            em.name as event_name, 
						            em.is_locked,
						            em.created_by,
						            null::integer as status_id,
						            STRING_AGG(psc.status_name::text, '', '') AS status,
						            null::integer as step_count,
						            null::text as offer_comment,
						            em.products_count as products_count,
						            em.stores_count as stores_count,
						            null::integer as product_selection_type_id,
						            null::text as product_selection_type,
						            null::integer as store_selection_type_id,
						            null::text as store_selection_type,
						            null::integer as exclusion_selection_type_id, 
						            null::text as exclusion_selection_type,
						            null::integer as customer_type_id,
						            STRING_AGG(tctc.customer_type::text, '', '') AS customer_type,
						            null::integer as offer_distribution_channel_id,
						            STRING_AGG(todcc.channel::text, '', '') AS offer_distribution_channel,
						            null::integer as last_approved_scenario_id,
						            null::integer as recommendation_type_id,
						            STRING_AGG(tasm.name, '', '') AS recommendation_type,
						            null::smallint as is_under_processing,
						            null::smallint as is_auto_resimulated,
						            null::smallint as is_overridden_scenario_finalized';

		promo_cte_date_selection := 'em.start_date,
                    				em.end_date,';

		promo_cte_group_by := 'em.start_date, em.end_date, 
		            em.event_id, 
		            em.name, em.is_locked, em.created_by, em.is_under_processing';

		promo_name_selection := 'null::integer as promo_id,
		        null::text AS promo_name,
		        pmc.start_date,
		        pmc.end_date,
		        pmc.event_id, 
		        pmc.event_name::text as event_name';

		aggregation_name := 'event';

		final_join := '
			LEFT JOIN 
		        finalized_cte fc 
			ON pmc.event_id = fc.event_id  
		    left join   
		        finalized_stack_cte fsc 
			on fsc.event_id = pmc.event_id
		    left join 
		        ia_recc_cte iarc 
			on pmc.event_id = iarc.event_id    
		    LEFT JOIN 
		        actualized_cte acc 
			ON pmc.event_id = acc.event_id
			LEFT JOIN
		        transaction_cte txnc 
			ON pmc.event_id = txnc.event_id
		';

		final_select_other_columns := 'null::integer as is_overridden,
		        null::text as override_comment,
		        null::text as override_reason,
		        null::integer as discount_level_id,
		        null::text as discount_level,';
		
		if (request_payload->'aggregation'->>'timeline')::int != -200 then
			final_join := '
				LEFT JOIN 
			        finalized_cte fc 
				ON pmc.event_id = fc.event_id and fc.fiscal_week = pmc.fiscal_week and fc.fiscal_year = pmc.fiscal_year
			    left join   
			        finalized_stack_cte fsc 
				on fsc.event_id = pmc.event_id and fsc.fiscal_week = pmc.fiscal_week and fsc.fiscal_year = pmc.fiscal_year
			    left join 
			        ia_recc_cte iarc 
				on pmc.event_id = iarc.event_id and iarc.fiscal_week = pmc.fiscal_week and iarc.fiscal_year = pmc.fiscal_year 
			    LEFT JOIN 
			        actualized_cte acc 
				ON pmc.event_id = acc.event_id and acc.fiscal_week = pmc.fiscal_week and acc.fiscal_year = pmc.fiscal_year
				LEFT JOIN
			        transaction_cte txnc 
				ON pmc.event_id = txnc.event_id and acc.fiscal_week = pmc.fiscal_week and acc.fiscal_year = pmc.fiscal_year
			';
		end if;

	elsif aggregation_constraint = 'promo_id' then  
		final_join := '
			LEFT JOIN
		        override_reason_comment orcc 
			ON pmc.promo_id = orcc.promo_id
		    LEFT JOIN 
		        promo_rules_cte prc 
			ON pmc.promo_id = prc.promo_id
		    LEFT JOIN 
		        finalized_cte fc 
			ON pmc.promo_id = fc.promo_id  
		    left join   
		        finalized_stack_cte fsc 
			on fsc.promo_id = pmc.promo_id
		    left join 
		        ia_recc_cte iarc 
			on pmc.promo_id = iarc.promo_id    
		    LEFT JOIN 
		        actualized_cte acc 
			ON pmc.promo_id = acc.promo_id
		    LEFT JOIN
		        transaction_cte txnc 
			ON pmc.promo_id = txnc.promo_id
		';

		if (request_payload->'aggregation'->>'timeline')::int != -200 then
			final_join := '
				LEFT JOIN
		        	override_reason_comment orcc 
				ON pmc.promo_id = orcc.promo_id
			    LEFT JOIN 
			        promo_rules_cte prc 
				ON pmc.promo_id = prc.promo_id
			    LEFT JOIN 
			        finalized_cte fc 
				ON pmc.promo_id = fc.promo_id  
				and fc.fiscal_week = pmc.fiscal_week and fc.fiscal_year = pmc.fiscal_year
			    left join   
			        finalized_stack_cte fsc 
				on fsc.promo_id = pmc.promo_id
				and fsc.fiscal_week = pmc.fiscal_week and fsc.fiscal_year = pmc.fiscal_year
			    left join 
			        ia_recc_cte iarc 
				on pmc.promo_id = iarc.promo_id   
				and iarc.fiscal_week = pmc.fiscal_week and iarc.fiscal_year = pmc.fiscal_year
			    LEFT JOIN 
			        actualized_cte acc 
				ON pmc.promo_id = acc.promo_id
				and acc.fiscal_week = pmc.fiscal_week and acc.fiscal_year = pmc.fiscal_year
			    LEFT JOIN
			        transaction_cte txnc 
				ON pmc.promo_id = txnc.promo_id
			';
		end if;

	end if;

	if (request_payload->'aggregation'->>'timeline')::int != -200 then
		promo_cte_join := 'join
		        	global.tb_fiscal_date_mapping tfdm on tfdm.date BETWEEN pmfc.start_date AND pmfc.end_date';
		promo_cte_date_selection := 'min(tfdm.date) AS start_date,
				    				MAX(tfdm.date) AS end_date,
									tfdm.fiscal_week,
									tfdm.fiscal_year,';
		promo_cte_timeline_group_by := 'tfdm.fiscal_week,
									tfdm.fiscal_year,';
		final_order_by := 'fc.fiscal_week';
	end if;
	
	strict_date_check := format(
			CASE 
				WHEN request_payload->>'show_partially_overlapping_events' = 'true' AND
					request_payload->>'metrics_display_mode' = 'selected_date_range'
				THEN 
					'fa.recommendation_date <= TO_DATE(%L, ''YYYY/MM/DD'') 
						AND fa.recommendation_date >= TO_DATE(%L, ''YYYY/MM/DD'')'
				ELSE 
					'TRUE'
			END,
			request_payload->>'end_date', request_payload->>'start_date'
		);


	_query := format('
		    %1$s , 
			target_currency_cte AS (
			    SELECT 
					fn_get_target_currency_id as target_currency_id  
				from 
					price_promo.fn_get_target_currency_id(
						(
							SELECT array_agg(DISTINCT currency_id) as source_currency_id
							FROM price_promo.ps_recommended_finalized_agg 
							WHERE promo_id IN (
								SELECT promo_id FROM price_promo.promo_master 
								where event_id in (select event_id from final_eligible_promos_cte)
							)
						),
						%27$L::integer
				)
			),
		    override_reason_comment AS(
		        SELECT
		            tpof.promo_id,
					pm.event_id,
		            tpof.comment as override_comment,
		            tpof.is_default,
		            tor.reason as override_reason
		        FROM
		            price_promo.tb_promo_override_forecast tpof
		        LEFT JOIN price_promo.tb_override_reason tor
		        ON tpof.reason = tor.id
				left join price_promo.promo_master pm
					on pm.promo_id = tpof.promo_id
		        WHERE
		            (tpof.promo_id, tpof.scenario_id) IN (
				    SELECT promo_id, coalesce(last_approved_scenario_id, 0) as scenario_id
				    FROM price_promo.promo_master
				    WHERE promo_id IN (SELECT promo_id FROM final_eligible_promos_cte)
				)
		    ),
			
			promo_master_details_cte AS (
		        SELECT
		            %17$s
					%16$s
		        FROM
		            final_eligible_promos_cte fep
		        JOIN
		            price_promo.promo_master pmfc ON fep.promo_id = pmfc.promo_id
				%15$s
		        LEFT JOIN 
		            price_promo.event_master em ON em.event_id = pmfc.event_id
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
		            metaschema.tb_app_sub_master tasm ON pmfc.recommendation_type_id = tasm.id
				
				GROUP BY
		            %18$s %19$s
		    ),
		    promo_rules_cte AS (
		        SELECT
		            pr.promo_id,
					fepc.event_id,
		            pr.discount_level AS discount_level_id,
		            dlc.discount_level_value AS discount_level
		        FROM
		            price_promo.ps_rules pr
		        LEFT JOIN
		            price_promo.discount_level_config dlc ON pr.discount_level = dlc.discount_level_id
		        inner join
		            (SELECT promo_id, event_id FROM final_eligible_promos_cte) fepc
					on pr.promo_id = fepc.promo_id
				where dlc.category = ''product''
		    ),
		    promo_override_forecast_cte as (
		        select
		        tpof.promo_id,
				pm.event_id,
		        tpof.is_default as is_override_default
		        from 
		            price_promo.tb_promo_override_forecast tpof
		        inner join
		            price_promo.promo_master pm
		        on pm.promo_id = tpof.promo_id and coalesce(pm.last_approved_scenario_id,0) = tpof.scenario_id
		        where pm.promo_id in (select promo_id from final_eligible_promos_cte)
		    ),
		    finalized_cte AS (
		        WITH
		            aggregated_data AS (
		                SELECT
		                    fepc.%2$s,
		                    min(fa.%3$s) as %3$s
							%9$s
							%6$s
							%7$s,
		                    case when tpof.is_override_default then sum(foa.margin * pfr.planned_conversion_multiplier) else SUM(fa.margin * pfr.planned_conversion_multiplier) end AS total_margin,
		                    case when tpof.is_override_default then SUM(foa.revenue * pfr.planned_conversion_multiplier) else SUM(fa.revenue * pfr.planned_conversion_multiplier) end AS total_revenue,
		                    case when tpof.is_override_default then SUM(foa.sales_units) else SUM(fa.sales_units) end AS total_sales_units,
		                    case when tpof.is_override_default then SUM(foa.baseline_sales_units) else SUM(fa.baseline_sales_units) end AS total_baseline_sales_units,
		                    case when tpof.is_override_default then SUM(foa.sales_units) - SUM(foa.baseline_sales_units) else SUM(fa.sales_units) - SUM(fa.baseline_sales_units) end AS total_incremental_sales_units,
		                    case when tpof.is_override_default then SUM(foa.baseline_revenue * pfr.planned_conversion_multiplier) else SUM(fa.baseline_revenue * pfr.planned_conversion_multiplier) end AS total_baseline_revenue,
		                    case when tpof.is_override_default then SUM(foa.revenue * pfr.planned_conversion_multiplier) - SUM(foa.baseline_revenue * pfr.planned_conversion_multiplier) else SUM(fa.revenue * pfr.planned_conversion_multiplier) - SUM(fa.baseline_revenue * pfr.planned_conversion_multiplier) end AS total_incremental_revenue,
		                    case when tpof.is_override_default then SUM(foa.baseline_margin * pfr.planned_conversion_multiplier) else SUM(fa.baseline_margin * pfr.planned_conversion_multiplier) end AS total_baseline_margin,
		                    case when tpof.is_override_default then SUM(foa.margin * pfr.planned_conversion_multiplier) - SUM(foa.baseline_margin * pfr.planned_conversion_multiplier) else SUM(fa.margin * pfr.planned_conversion_multiplier) - SUM(fa.baseline_margin * pfr.planned_conversion_multiplier) end AS total_incremental_margin,
		                    case when tpof.is_override_default then SUM(foa.promo_spend * pfr.planned_conversion_multiplier) else SUM(fa.promo_spend * pfr.planned_conversion_multiplier) end AS total_promo_spend,
		                    case when tpof.is_override_default then SUM(foa.contribution_revenue * pfr.planned_conversion_multiplier) else SUM(fa.contribution_revenue * pfr.planned_conversion_multiplier) end AS total_contribution_revenue,
		                    case when tpof.is_override_default then SUM(foa.contribution_margin * pfr.planned_conversion_multiplier) else SUM(fa.contribution_margin * pfr.planned_conversion_multiplier) end AS total_contribution_margin,
		                    case when tpof.is_override_default then MIN(foa.offer_type_combined_display_name) else MIN(fa.offer_type_combined_display_name) end as offer_type_combined_display_name,
		
		                    case when coalesce(tpof.is_override_default,false) then SUM(fa.margin * pfr.planned_conversion_multiplier) else null end AS original_total_margin,
		                    case when coalesce(tpof.is_override_default,false) then SUM(fa.revenue * pfr.planned_conversion_multiplier) else null end AS original_total_revenue,
		                    case when coalesce(tpof.is_override_default,false) then SUM(fa.sales_units) else null end AS original_total_sales_units,
		                    case when coalesce(tpof.is_override_default,false) then SUM(fa.baseline_sales_units) else null end AS original_total_baseline_sales_units,
		                    case when coalesce(tpof.is_override_default,false) then SUM(fa.sales_units) - SUM(fa.baseline_sales_units) else null end AS original_total_incremental_sales_units,
		                    case when coalesce(tpof.is_override_default,false) then SUM(fa.baseline_revenue * pfr.planned_conversion_multiplier) else null end AS original_total_baseline_revenue,
		                    case when coalesce(tpof.is_override_default,false) then SUM(fa.revenue * pfr.planned_conversion_multiplier) - SUM(fa.baseline_revenue * pfr.planned_conversion_multiplier) else null end AS original_total_incremental_revenue,
		                    case when coalesce(tpof.is_override_default,false) then SUM(fa.baseline_margin * pfr.planned_conversion_multiplier) else null end AS original_total_baseline_margin,
		                    case when coalesce(tpof.is_override_default,false) then SUM(fa.margin * pfr.planned_conversion_multiplier) - SUM(fa.baseline_margin * pfr.planned_conversion_multiplier) else null end AS original_total_incremental_margin,
		                    case when coalesce(tpof.is_override_default,false) then SUM(fa.promo_spend * pfr.planned_conversion_multiplier) else null end AS original_total_promo_spend,
		                    case when coalesce(tpof.is_override_default,false) then SUM(fa.contribution_revenue * pfr.planned_conversion_multiplier) else null end AS original_total_contribution_revenue,
		                    case when coalesce(tpof.is_override_default,false) then SUM(fa.contribution_margin * pfr.planned_conversion_multiplier) else null end AS original_total_contribution_margin,
		                    case when coalesce(tpof.is_override_default,false) then MIN(fa.offer_type_combined_display_name) else null end as original_offer_type_combined_display_name,
							max(fepc.total_inventory) as finalized_total_inventory,
							least(100, GREATEST(0, case 
							when coalesce(max(fepc.total_inventory), 0) = 0 then 0 
							else round(((round(case when tpof.is_override_default then SUM(foa.sales_units) else SUM(fa.sales_units) end::DECIMAL, 2) / max(fepc.total_inventory)) * 100)::DECIMAL, 1) 
							end)) AS finalized_st_percent
		
		                FROM
		                    price_promo.ps_recommended_finalized%8$s fa
		                left join(
								select 
									* 
								from 
									price_promo.ps_recommended_finalized_override%8$s foa
								where
									foa.promo_id in (%11$s)
							) foa
		                on fa.%2$s = foa.%2$s and fa.recommendation_date = foa.recommendation_date
		                left join
		                    promo_override_forecast_cte tpof
		                on tpof.%2$s = fa.%2$s
		                %4$s
						left join final_eligible_promos_cte fepc on fepc.promo_id = fa.promo_id
						inner join 
		                    global.planned_forex_rate pfr 
		                    on 
		                        fa.recommendation_date = pfr.date 
		                        and pfr.source_currency_id = fa.currency_id
		                        and pfr.target_currency_id = (SELECT target_currency_id FROM target_currency_cte)
		                WHERE
							%26$s 
							AND
		                    fa.promo_id IN (
		                        %11$s
		                    )
		                GROUP BY
		                    fepc.%2$s ,tpof.is_override_default %5$s %6$s %7$s
		            )
		        SELECT
		            promo_id,
					event_id
					%10$s
					%6$s
					%7$s,
		            ROUND(total_sales_units::DECIMAL, 2) AS finalized_sales_units,
		            ROUND(total_baseline_sales_units::DECIMAL, 2) AS finalized_baseline_sales_units,
		            ROUND(total_incremental_sales_units::DECIMAL, 2) AS finalized_incremental_sales_units,
		            ROUND(total_revenue::DECIMAL, 2) AS finalized_revenue,
		            ROUND(total_baseline_revenue::DECIMAL, 2) AS finalized_baseline_revenue,
		            ROUND(total_incremental_revenue::DECIMAL, 2) AS finalized_incremental_revenue,
		            ROUND(total_margin::DECIMAL, 2) AS finalized_margin,
		            ROUND(total_baseline_margin::DECIMAL, 2) AS finalized_baseline_margin,
		            ROUND(total_incremental_margin::DECIMAL, 2) AS finalized_incremental_margin,
		            ROUND(total_promo_spend::DECIMAL, 2) AS finalized_promo_spend,
		            ROUND(total_contribution_revenue::DECIMAL, 2) AS finalized_contribution_revenue,
		            ROUND(total_contribution_margin::DECIMAL, 2) AS finalized_contribution_margin,
		            offer_type_combined_display_name as finalized_discount,
		            CASE
		                WHEN total_revenue != 0 THEN ROUND((total_margin * 100 / total_revenue)::NUMERIC, 2)
		                ELSE 0
		            END AS finalized_margin_percent,
		            CASE
		                WHEN total_contribution_revenue != 0 THEN ROUND((total_contribution_margin * 100 / total_contribution_revenue)::NUMERIC, 2)
		                ELSE 0
		            END AS finalized_contribution_margin_percent,
		            CASE
		                WHEN total_baseline_margin IS NULL
		                OR total_baseline_margin = 0 THEN NULL
		                ELSE ROUND(
		                    (
		                        total_incremental_margin / ABS(total_baseline_margin)
		                    )::DECIMAL * 100::DECIMAL,
		                    2
		                )
		            END AS performance,

		            ROUND(original_total_sales_units::DECIMAL, 2) AS original_sales_units,
		            ROUND(original_total_baseline_sales_units::DECIMAL, 2) AS original_baseline_sales_units,
		            ROUND(original_total_incremental_sales_units::DECIMAL, 2) AS original_incremental_sales_units,
		            ROUND(original_total_revenue::DECIMAL, 2) AS original_revenue,
		            ROUND(original_total_baseline_revenue::DECIMAL, 2) AS original_baseline_revenue,
		            ROUND(original_total_incremental_revenue::DECIMAL, 2) AS original_incremental_revenue,
		            ROUND(original_total_margin::DECIMAL, 2) AS original_margin,
		            ROUND(original_total_baseline_margin::DECIMAL, 2) AS original_baseline_margin,
		            ROUND(original_total_incremental_margin::DECIMAL, 2) AS original_incremental_margin,
		            ROUND(original_total_promo_spend::DECIMAL, 2) AS original_promo_spend,
		            ROUND(original_total_contribution_revenue::DECIMAL, 2) AS original_contribution_revenue,
		            ROUND(original_total_contribution_margin::DECIMAL, 2) AS original_contribution_margin,
		            original_offer_type_combined_display_name as original_discount,
		            CASE
		                WHEN original_total_revenue != 0 THEN ROUND((original_total_margin * 100 / original_total_revenue)::NUMERIC, 2)
		                ELSE 0
		            END AS original_margin_percent,
		            CASE
		                WHEN original_total_contribution_revenue != 0 THEN ROUND((original_total_contribution_margin * 100 / original_total_contribution_revenue)::NUMERIC, 2)
		                ELSE 0
		            END AS original_contribution_margin_percent,
		            CASE
		                WHEN original_total_baseline_margin IS NULL
		                OR original_total_baseline_margin = 0 THEN NULL
		                ELSE ROUND(
		                    (
		                        original_total_incremental_margin / ABS(original_total_baseline_margin)
		                    )::DECIMAL * 100::DECIMAL,
		                    2
		                )
		            end as original_performance,
					finalized_total_inventory,
					finalized_st_percent
		        FROM
		            aggregated_data
		    ),
		    finalized_stack_cte as (
		        WITH
		            aggregated_data AS (
		                SELECT
		                    fepc.%2$s,
		                    min(fepc.%3$s) as %3$s
							%9$s
							%6$s
							%7$s,
		                    case when tpof.is_override_default then sum(foa.margin * pfr.planned_conversion_multiplier) else SUM(fa.margin * pfr.planned_conversion_multiplier) end AS total_margin,
		                    case when tpof.is_override_default then SUM(foa.revenue * pfr.planned_conversion_multiplier) else SUM(fa.revenue * pfr.planned_conversion_multiplier) end AS total_revenue,
		                    case when tpof.is_override_default then SUM(foa.sales_units) else SUM(fa.sales_units) end AS total_sales_units,
		                    case when tpof.is_override_default then SUM(foa.baseline_sales_units) else SUM(fa.baseline_sales_units) end AS total_baseline_sales_units,
		                    case when tpof.is_override_default then SUM(foa.sales_units) - SUM(foa.baseline_sales_units) else SUM(fa.sales_units) - SUM(fa.baseline_sales_units) end AS total_incremental_sales_units,
		                    case when tpof.is_override_default then SUM(foa.baseline_revenue * pfr.planned_conversion_multiplier) else SUM(fa.baseline_revenue * pfr.planned_conversion_multiplier) end AS total_baseline_revenue,
		                    case when tpof.is_override_default then SUM(foa.revenue * pfr.planned_conversion_multiplier) - SUM(foa.baseline_revenue * pfr.planned_conversion_multiplier) else SUM(fa.revenue * pfr.planned_conversion_multiplier) - SUM(fa.baseline_revenue * pfr.planned_conversion_multiplier) end AS total_incremental_revenue,
		                    case when tpof.is_override_default then SUM(foa.baseline_margin * pfr.planned_conversion_multiplier) else SUM(fa.baseline_margin * pfr.planned_conversion_multiplier) end AS total_baseline_margin,
		                    case when tpof.is_override_default then SUM(foa.margin * pfr.planned_conversion_multiplier) - SUM(foa.baseline_margin * pfr.planned_conversion_multiplier) else SUM(fa.margin * pfr.planned_conversion_multiplier) - SUM(fa.baseline_margin * pfr.planned_conversion_multiplier) end AS total_incremental_margin,
		                    case when tpof.is_override_default then SUM(foa.promo_spend * pfr.planned_conversion_multiplier) else SUM(fa.promo_spend * pfr.planned_conversion_multiplier) end AS total_promo_spend,
		                    case when tpof.is_override_default then SUM(foa.contribution_revenue * pfr.planned_conversion_multiplier) else SUM(fa.contribution_revenue * pfr.planned_conversion_multiplier) end AS total_contribution_revenue,
		                    case when tpof.is_override_default then SUM(foa.contribution_margin * pfr.planned_conversion_multiplier) else SUM(fa.contribution_margin * pfr.planned_conversion_multiplier) end AS total_contribution_margin,
		                    case when tpof.is_override_default then MIN(foa.offer_type_combined_display_name) else MIN(fa.offer_type_combined_display_name) end as offer_type_combined_display_name,
		
		                    case when coalesce(tpof.is_override_default,false) then SUM(fa.margin * pfr.planned_conversion_multiplier) else null end AS original_total_margin,
		                    case when coalesce(tpof.is_override_default,false) then SUM(fa.revenue * pfr.planned_conversion_multiplier) else null end AS original_total_revenue,
		                    case when coalesce(tpof.is_override_default,false) then SUM(fa.sales_units) else null end AS original_total_sales_units,
		                    case when coalesce(tpof.is_override_default,false) then SUM(fa.baseline_sales_units) else null end AS original_total_baseline_sales_units,
		                    case when coalesce(tpof.is_override_default,false) then SUM(fa.sales_units) - SUM(fa.baseline_sales_units) else null end AS original_total_incremental_sales_units,
		                    case when coalesce(tpof.is_override_default,false) then SUM(fa.baseline_revenue * pfr.planned_conversion_multiplier) else null end AS original_total_baseline_revenue,
		                    case when coalesce(tpof.is_override_default,false) then SUM(fa.revenue * pfr.planned_conversion_multiplier) - SUM(fa.baseline_revenue * pfr.planned_conversion_multiplier) else null end AS original_total_incremental_revenue,
		                    case when coalesce(tpof.is_override_default,false) then SUM(fa.baseline_margin * pfr.planned_conversion_multiplier) else null end AS original_total_baseline_margin,
		                    case when coalesce(tpof.is_override_default,false) then SUM(fa.margin * pfr.planned_conversion_multiplier) - SUM(fa.baseline_margin * pfr.planned_conversion_multiplier) else null end AS original_total_incremental_margin,
		                    case when coalesce(tpof.is_override_default,false) then SUM(fa.promo_spend * pfr.planned_conversion_multiplier) else null end AS original_total_promo_spend,
		                    case when coalesce(tpof.is_override_default,false) then SUM(fa.contribution_revenue * pfr.planned_conversion_multiplier) else null end AS original_total_contribution_revenue,
		                    case when coalesce(tpof.is_override_default,false) then SUM(fa.contribution_margin * pfr.planned_conversion_multiplier) else null end AS original_total_contribution_margin,
							max(fepc.total_inventory) as finalized_stack_total_inventory,
							least(100, GREATEST(0, case 
							when coalesce(max(fepc.total_inventory), 0) = 0 then 0 
							else round(((round(case when tpof.is_override_default then SUM(foa.sales_units) else SUM(fa.sales_units) end::DECIMAL, 2) / max(fepc.total_inventory)) * 100)::DECIMAL, 1) 
							end)) AS finalized_stack_st_percent
		
		                FROM
		                    final_eligible_promos_cte fepc
		                left join 
		                    price_promo.ps_recommended_finalized_stack%8$s fa
		                on 
							%12$s
		                left join
		                    price_promo.ps_recommended_finalized_stack_override%8$s foa
		                on 
							%13$s
							fa.recommendation_date = foa.recommendation_date
		                left join
		                    promo_override_forecast_cte tpof
		                on tpof.promo_id = fepc.promo_id
						inner join 
		                    global.planned_forex_rate pfr 
		                    on 
		                        fa.recommendation_date = pfr.date 
		                        and pfr.source_currency_id = fa.currency_id
		                        and pfr.target_currency_id = (SELECT target_currency_id FROM target_currency_cte)
		                %4$s
						WHERE %26$s
		                GROUP BY
		                    fepc.%2$s ,tpof.is_override_default %5$s %6$s %7$s
		            )
		        SELECT
		            promo_id,
					event_id
					%10$s
					%6$s
					%7$s,
		            ROUND(total_sales_units::DECIMAL, 2) AS finalized_stack_sales_units,
		            ROUND(total_baseline_sales_units::DECIMAL, 2) AS finalized_stack_baseline_sales_units,
		            ROUND(total_incremental_sales_units::DECIMAL, 2) AS finalized_stack_incremental_sales_units,
		            ROUND(total_revenue::DECIMAL, 2) AS finalized_stack_revenue,
		            ROUND(total_baseline_revenue::DECIMAL, 2) AS finalized_stack_baseline_revenue,
		            ROUND(total_incremental_revenue::DECIMAL, 2) AS finalized_stack_incremental_revenue,
		            ROUND(total_margin::DECIMAL, 2) AS finalized_stack_margin,
		            ROUND(total_baseline_margin::DECIMAL, 2) AS finalized_stack_baseline_margin,
		            ROUND(total_incremental_margin::DECIMAL, 2) AS finalized_stack_incremental_margin,
		            ROUND(total_promo_spend::DECIMAL, 2) AS finalized_stack_promo_spend,
		            ROUND(total_contribution_revenue::DECIMAL, 2) AS finalized_stack_contribution_revenue,
		            ROUND(total_contribution_margin::DECIMAL, 2) AS finalized_stack_contribution_margin,
		            CASE
		                WHEN total_revenue != 0 THEN ROUND((total_margin * 100 / total_revenue)::NUMERIC, 2)
		                ELSE 0
		            END AS finalized_stack_margin_percent,
		            CASE
		                WHEN total_contribution_revenue != 0 THEN ROUND((total_contribution_margin * 100 / total_contribution_revenue)::NUMERIC, 2)
		                ELSE 0
		            END AS finalized_stack_contribution_margin_percent,
		            CASE
		                WHEN total_baseline_margin IS NULL
		                OR total_baseline_margin = 0 THEN NULL
		                ELSE ROUND(
		                    (
		                        total_incremental_margin / ABS(total_baseline_margin)
		                    )::DECIMAL * 100::DECIMAL,
		                    2
		                )
		            END AS stack_performance,
		
		            ROUND(original_total_sales_units::DECIMAL, 2) AS original_stack_sales_units,
		            ROUND(original_total_baseline_sales_units::DECIMAL, 2) AS original_stack_baseline_sales_units,
		            ROUND(original_total_incremental_sales_units::DECIMAL, 2) AS original_stack_incremental_sales_units,
		            ROUND(original_total_revenue::DECIMAL, 2) AS original_stack_revenue,
		            ROUND(original_total_baseline_revenue::DECIMAL, 2) AS original_stack_baseline_revenue,
		            ROUND(original_total_incremental_revenue::DECIMAL, 2) AS original_stack_incremental_revenue,
		            ROUND(original_total_margin::DECIMAL, 2) AS original_stack_margin,
		            ROUND(original_total_baseline_margin::DECIMAL, 2) AS original_stack_baseline_margin,
		            ROUND(original_total_incremental_margin::DECIMAL, 2) AS original_stack_incremental_margin,
		            ROUND(original_total_promo_spend::DECIMAL, 2) AS original_stack_promo_spend,
		            ROUND(original_total_contribution_revenue::DECIMAL, 2) AS original_stack_contribution_revenue,
		            ROUND(original_total_contribution_margin::DECIMAL, 2) AS original_stack_contribution_margin,
		            CASE
		                WHEN original_total_revenue != 0 THEN ROUND((original_total_margin * 100 / original_total_revenue)::NUMERIC, 2)
		                ELSE 0
		            END AS original_stack_margin_percent,
		            CASE
		                WHEN original_total_contribution_revenue != 0 THEN ROUND((original_total_contribution_margin * 100 / original_total_contribution_revenue)::NUMERIC, 2)
		                ELSE 0
		            END AS original_stack_contribution_margin_percent,
		            CASE
		                WHEN original_total_baseline_margin IS NULL
		                OR original_total_baseline_margin = 0 THEN NULL
		                ELSE ROUND(
		                    (
		                        original_total_incremental_margin / ABS(original_total_baseline_margin)
		                    )::DECIMAL * 100::DECIMAL,
		                    2
		                )
		            end as original_stack_performance,
					finalized_stack_st_percent
		        FROM
		            aggregated_data
		    ),
		    ia_recc_cte AS (
		        SELECT
		            fepc.%2$s,
		            min(fa.%3$s) as %3$s
					%9$s
					%6$s
					%7$s,
		            MIN(offer_type_combined_display_name) AS ia_recc_discount
		        FROM
		            price_promo.ps_recommended_ia_projected%8$s fa
				left join final_eligible_promos_cte fepc on fepc.promo_id = fa.promo_id
		        %4$s
		        WHERE
		            fa.promo_id IN (%11$s)
		        GROUP BY
		            fepc.%2$s %5$s %6$s %7$s
		    ),
		    actualized_cte AS (
		        WITH
		            aggregated_data AS (
		                SELECT
		                    fepc.%2$s,
		                    min(fa.%3$s) as %3$s
							%9$s
							%6$s
							%7$s,
		                    SUM(sales_units) AS total_sales_units,
		                    SUM(baseline_sales_units) AS total_baseline_sales_units,
		                    SUM(sales_units) - SUM(baseline_sales_units) AS total_incremental_sales_units,
		                    SUM(revenue * afr.planned_conversion_multiplier) AS total_revenue,
		                    SUM(baseline_revenue * afr.planned_conversion_multiplier) AS total_baseline_revenue,
		                    SUM(revenue * afr.planned_conversion_multiplier) - SUM(baseline_revenue * afr.planned_conversion_multiplier) AS total_incremental_revenue,
		                    SUM(margin * afr.planned_conversion_multiplier) AS total_margin,
		                    SUM(baseline_margin * afr.planned_conversion_multiplier) AS total_baseline_margin,
		                    SUM(margin * afr.planned_conversion_multiplier) - SUM(baseline_margin * afr.planned_conversion_multiplier) AS total_incremental_margin,
		                    SUM(contribution_revenue * afr.planned_conversion_multiplier) AS total_contribution_revenue,
		                    SUM(contribution_margin * afr.planned_conversion_multiplier) AS total_contribution_margin,
		                    SUM(promo_spend * afr.planned_conversion_multiplier) AS total_promo_spend,
							max(fepc.total_inventory) as actualized_total_inventory,
							least(100, GREATEST(0, case 
							when coalesce(max(fepc.total_inventory), 0) = 0 then 0 
							else round(((SUM(sales_units) / max(fepc.total_inventory)) * 100)::DECIMAL, 1) 
							end)) AS actualized_st_percent
		                FROM
		                    price_promo.ps_recommended_actuals%8$s fa
		                %4$s
						left join final_eligible_promos_cte fepc on fepc.promo_id = fa.promo_id
						inner join 
		                    global.actual_forex_rate afr 
		                    on 
		                        fa.recommendation_date = afr.date 
		                        and afr.source_currency_id = fa.currency_id
		                        and afr.target_currency_id = (SELECT target_currency_id FROM target_currency_cte)
		                WHERE
		                    fa.promo_id IN (
		                        %11$s
		                    )
		                GROUP BY
		                    fepc.%2$s %5$s %6$s %7$s
		            )
		        SELECT
		            promo_id,
					event_id
					%10$s
					%6$s
					%7$s,
		            ROUND(total_sales_units::DECIMAL, 2) AS actualized_sales_units,
		            ROUND(total_baseline_sales_units::DECIMAL, 2) AS actualized_baseline_sales_units,
		            ROUND(total_incremental_sales_units::DECIMAL, 2) AS actualized_incremental_sales_units,
		            ROUND(total_revenue::DECIMAL, 2) AS actualized_revenue,
		            ROUND(total_baseline_revenue::DECIMAL, 2) AS actualized_baseline_revenue,
		            ROUND(total_incremental_revenue::DECIMAL, 2) AS actualized_incremental_revenue,
		            ROUND(total_margin::DECIMAL, 2) AS actualized_margin,
		            ROUND(total_baseline_margin::DECIMAL, 2) AS actualized_baseline_margin,
		            ROUND(total_incremental_margin::DECIMAL, 2) AS actualized_incremental_margin,
		            ROUND(total_contribution_revenue::DECIMAL, 2) AS actualized_contribution_revenue,
		            ROUND(total_contribution_margin::DECIMAL, 2) AS actualized_contribution_margin,
		            ROUND(total_promo_spend::DECIMAL, 2) AS actualized_promo_spend,
		            CASE
		                WHEN total_revenue != 0 THEN ROUND((total_margin * 100 / total_revenue)::NUMERIC, 2)
		                ELSE 0
		            END AS actualized_margin_percent,
		            CASE
		                WHEN total_contribution_revenue != 0 THEN ROUND((total_contribution_margin * 100 / total_contribution_revenue)::NUMERIC, 2)
		                ELSE 0
		            END AS actualized_contribution_margin_percent,
		            CASE
		                WHEN total_baseline_margin IS NULL
		                OR total_baseline_margin = 0 THEN NULL
		                ELSE ROUND(
		                    (
		                        total_incremental_margin / ABS(total_baseline_margin)
		                    )::DECIMAL * 100::DECIMAL,
		                    2
		                )
		            END AS performance,
					actualized_total_inventory,
					actualized_st_percent
		        FROM
		            aggregated_data
		    ),
		    transaction_cte AS (
		        SELECT
		            tpb.%2$s,
		            tpb.promo_offer_txn AS no_of_txn,
		            tpb.promo_offer_units_per_txn AS units_per_txn,
		            tpb.promo_offer_avg_basket_size AS avg_basket_size
		        FROM
		            price_promo.tb_%21$s_basketdetails tpb
				inner join (SELECT promo_id, event_id FROM final_eligible_promos_cte) fepc
				on fepc.%2$s = tpb.%2$s
		    )
		    SELECT
		        %20$s,
				%24$s as product_master_data,
				%25$s as store_master_data,
		        pmc.is_locked,
		        um.name::text AS created_by,
		        pmc.offer_comment,
		        pmc.status_id::int as status_id,
		        pmc.status,
		        pmc.step_count::int as step_count,
		        pmc.products_count::integer as products_count,
		        pmc.stores_count::integer as stores_count,
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
		        pmc.last_approved_scenario_id,
		        pmc.recommendation_type_id::int as recommendation_type_id,
		        pmc.recommendation_type,
		        pmc.is_under_processing,
		        pmc.is_auto_resimulated,
		        tcm.currency_id,
                tcm.currency_symbol::text,
                tcm.currency_name::text,
		        %22$s
		
		        CASE 
				    WHEN acc.performance IS NULL THEN NULL 
				    ELSE price_promo.fn_get_performance_repr(acc.performance) 
				END AS actual_performance,
				CASE 
				    WHEN fc.performance IS NULL THEN NULL 
				    ELSE price_promo.fn_get_performance_repr(fc.performance) 
				END AS finalized_performance,
		        COALESCE(
		            CASE
		                WHEN pmc.products_count != 0 THEN ROUND((fc.finalized_revenue / pmc.products_count)::NUMERIC, 2)
		                ELSE 0
		            END,
		            CASE
		                WHEN pmc.products_count != 0 THEN ROUND((acc.actualized_revenue / pmc.products_count)::NUMERIC, 2)
		                ELSE 0
		            END
		        ) AS revenue_per_style,
		        txnc.no_of_txn,
		        txnc.units_per_txn,
		        txnc.avg_basket_size,
		        ---
		        acc.actualized_promo_spend,
		
		        fc.finalized_margin,
		        fc.finalized_revenue,
		        fc.finalized_discount,
		        fc.finalized_promo_spend,
		        fc.finalized_sales_units,
		        fc.finalized_margin_percent,
		        fc.finalized_contribution_margin,
		        fc.finalized_contribution_revenue,
				fc.finalized_baseline_sales_units as finalized_baseline_sales_units,
				fc.finalized_baseline_revenue as finalized_baseline_revenue,
				fc.finalized_baseline_margin as finalized_baseline_margin,
		        fc.finalized_contribution_margin_percent,
		        iarc.ia_recc_discount,
		        fc.original_margin,
		        fc.original_revenue,
		        fc.original_discount,
		        fc.original_promo_spend,
		        fc.original_sales_units,
		        fc.original_margin_percent,
		        fc.original_contribution_margin,
		        fc.original_contribution_revenue,
		        fc.original_contribution_margin_percent,
		        fsc.finalized_stack_baseline_margin,
		        fsc.finalized_stack_baseline_revenue,
		        fsc.finalized_stack_baseline_sales_units,
		        fsc.finalized_stack_margin,
		        fsc.finalized_stack_revenue,
		        fsc.finalized_stack_promo_spend,
		        fsc.finalized_stack_sales_units,
		        fsc.finalized_stack_margin_percent,
		        fsc.finalized_stack_contribution_margin,
		        fsc.finalized_stack_contribution_revenue,
		        fsc.finalized_stack_contribution_margin_percent,
		        fsc.original_stack_margin,
		        fsc.original_stack_revenue,
		        fsc.original_stack_promo_spend,
		        fsc.original_stack_sales_units,
		        fsc.original_stack_margin_percent,
		        fsc.original_stack_contribution_margin,
		        fsc.original_stack_contribution_revenue,
		        fsc.original_stack_contribution_margin_percent,
		        fc.finalized_incremental_sales_units,
		        fc.finalized_incremental_revenue,
		        fc.finalized_incremental_margin,
		        acc.actualized_incremental_sales_units,
		        acc.actualized_incremental_revenue,
		        acc.actualized_incremental_margin,
		        acc.actualized_margin,
		        acc.actualized_revenue,
		        acc.actualized_sales_units,
		        acc.actualized_margin_percent,
		        acc.actualized_contribution_margin,
		        acc.actualized_contribution_revenue,
		        acc.actualized_contribution_margin_percent,
		        fsc.finalized_stack_incremental_sales_units,
		        fsc.finalized_stack_incremental_revenue,
		        fsc.finalized_stack_incremental_margin,
				fc.finalized_total_inventory,
				fc.finalized_st_percent,
				fsc.finalized_stack_st_percent,
				acc.actualized_st_percent

		    FROM 
		        promo_master_details_cte pmc
		    %14$s
		    LEFT JOIN 
		        global.user_master um 
			inner join
            	global.tb_currency_master tcm
            	on tcm.currency_id = (select target_currency_id from target_currency_cte)
			ON pmc.created_by = um.user_code
		    ORDER BY 
		        %23$s;', 
	filtered_promo_cte_query, 
	aggregation_constraint, 
	non_aggregation_constraint, 
	join_str, 
	group_by_str, 
	product_columns, 
	store_columns, 
	agg_table, 
	time_based_selections_str, 
	time_based_selections, 
	other_cte_where_condition, 
	finalized_stacked_cte_join_1, 
	finalized_stacked_cte_join_2,
	final_join,
	promo_cte_join,
	promo_cte_other_selections,
	promo_cte_date_selection,
	promo_cte_timeline_group_by,
	promo_cte_group_by,
	promo_name_selection,
	aggregation_name,
	final_select_other_columns,
	final_order_by,
	selected_product_columns,
	selected_store_columns,
	strict_date_check,
	COALESCE(request_payload->>'target_currency_id', NULL)
	);

	raise notice 'final query - %', _query;

	-- Execute the final query
    RETURN QUERY EXECUTE _query;

END;
$function$
;