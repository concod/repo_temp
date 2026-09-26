--liquibase formatted sql
--changeset harsh.singh@impactanalytics.co:fn_approve_ia_scenario runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for fn_approve_ia_scenario

DROP FUNCTION if exists price_promo.fn_approve_ia_scenario;

CREATE OR REPLACE FUNCTION price_promo.fn_approve_ia_scenario(p_promo_id integer, p_scenario_id integer, p_user_id integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    _scenario_exists boolean;
	_query text;
	_column_names text;
	_start_date date;
	_end_date date;
	_scenario_order_id int;
BEGIN
    -- Check if scenario exists
    SELECT EXISTS (
        SELECT 1 
        FROM price_promo.scenario_master 
        WHERE scenario_id = p_scenario_id AND promo_id = p_promo_id
    ) INTO _scenario_exists;

    IF NOT _scenario_exists THEN
        RAISE EXCEPTION 'Scenario % does not exist for promo %', p_scenario_id, p_promo_id;
    END IF;

	select scenario_order_id into _scenario_order_id from price_promo.scenario_master where scenario_id = p_scenario_id;

    -- Delete existing data from ps_recommended_scenario tables
    call 
        price_promo_opt.pc_delete_promo_metrics(
            array[]::integer[],
            array[p_scenario_id], 
            1,
            0,
            1 
        );

	SELECT start_date, end_date 
	INTO _start_date, _end_date 
	FROM price_promo.promo_master 
	WHERE promo_id = p_promo_id;

	CALL price_promo_opt.pc_simulation_create_column_day_partitions('price_promo.ps_recommended_scenarios',
	    ARRAY[p_scenario_id], _start_date, _end_date);

    -- Copy data from ps_recommended_ia_projected to ps_recommended_scenarios
	_column_names := price_promo.fn_get_table_columns('price_promo', 'ps_recommended_scenarios');
    
	_query := format('
        INSERT INTO price_promo.ps_recommended_scenarios (%1$s)
        SELECT 
            %2$s
        FROM price_promo.ps_recommended_ia_projected
        WHERE promo_id = %3$s
    ', _column_names,
	    price_promo.fn_replace_values(
	        _column_names,
	        jsonb_build_object(
	            'promo_id', p_promo_id,
	            'scenario_id', p_scenario_id,
	            'user_id', p_user_id
	        )
	    ),
	    p_promo_id
	);
	raise notice 'query 1: %', _query;
	execute _query;

	-- Copy data from ps_recommended_ia_projected_agg to ps_recommended_scenarios_agg
	_column_names := price_promo.fn_get_table_columns('price_promo', 'ps_recommended_scenarios_agg');
	
	_query := format('
        INSERT INTO price_promo.ps_recommended_scenarios_agg (%1$s)
        SELECT 
            %2$s
        FROM price_promo.ps_recommended_ia_projected_agg
        WHERE promo_id = %3$s
    ', _column_names,
	    price_promo.fn_replace_values(
	        _column_names,
	        jsonb_build_object(
	            'promo_id', p_promo_id,
	            'scenario_id', p_scenario_id,
	            'user_id', p_user_id
	        )
	    ),
	    p_promo_id
	);
	raise notice 'query 2: %', _query;
	execute _query;


    CALL price_promo_opt.pc_simulation_create_column_day_partitions(
        'price_promo.ps_recommended_override',
	    ARRAY[p_scenario_id],
        _start_date,
        _end_date
    );

    _column_names := price_promo.fn_get_table_columns('price_promo', 'ps_recommended_override');
    
	_query := format('
        INSERT INTO price_promo.ps_recommended_override (%1$s)
        SELECT 
            %2$s
        FROM price_promo.ps_recommended_override_ia
        WHERE promo_id = %3$s
    ', _column_names,
	    price_promo.fn_replace_values(
	        _column_names,
	        jsonb_build_object(
	            'promo_id', p_promo_id,
	            'scenario_id', p_scenario_id,
	            'user_id', p_user_id
	        )
	    ),
	    p_promo_id
	);
	raise notice 'query 3: %', _query;
    execute _query;

    _column_names = price_promo.fn_get_table_columns('price_promo', 'ps_recommended_override_agg');
    
	_query := format('
        INSERT INTO price_promo.ps_recommended_override_agg (%1$s)
        SELECT 
            %2$s
        FROM price_promo.ps_recommended_override_ia_agg
        WHERE promo_id = %3$s
    ', _column_names,
	    price_promo.fn_replace_values(
	        _column_names,
	        jsonb_build_object(
	            'promo_id', p_promo_id,
	            'scenario_id', p_scenario_id,
	            'user_id', p_user_id
            )
        ),
        p_promo_id
	);
	raise notice 'query 4: %', _query;
    execute _query;

	-- Copy data from ps_recommended_stack_ia_agg to ps_recommended_scenarios_stack_agg
	_column_names := price_promo.fn_get_table_columns('price_promo', 'ps_recommended_scenarios_stack_agg');

	_query := format('
        INSERT INTO price_promo.ps_recommended_scenarios_stack_agg (%1$s)
        SELECT 
            %2$s
        FROM price_promo.ps_recommended_stack_ia_agg
        WHERE promo_id = %3$s
    ', _column_names,
	    price_promo.fn_replace_values(
	        _column_names,
	        jsonb_build_object(
	            'promo_id', p_promo_id,
	            'scenario_id', p_scenario_id,
	            'user_id', p_user_id
	        )
	    ),
	    p_promo_id
	);
	raise notice 'query 3: %', _query;
	execute _query;

	CALL price_promo_opt.pc_simulation_create_column_day_partitions('price_promo.ps_recommended_scenarios_stack',
	    ARRAY[p_scenario_id], _start_date, _end_date);

	-- Copy data from ps_recommended_stack_ia to ps_recommended_scenarios_stack
	_column_names := price_promo.fn_get_table_columns('price_promo', 'ps_recommended_scenarios_stack');

	_query := format('
        INSERT INTO price_promo.ps_recommended_scenarios_stack (%1$s)
        SELECT 
            %2$s
        FROM price_promo.ps_recommended_stack_ia
        WHERE promo_id = %3$s
    ', _column_names,
	    price_promo.fn_replace_values(
	        _column_names,
	        jsonb_build_object(
	            'promo_id', p_promo_id,
	            'scenario_id', p_scenario_id,
	            'user_id', p_user_id
	        )
	    ),
	    p_promo_id
	);
	raise notice 'query 4: %', _query;
	execute _query;

	CALL price_promo_opt.pc_simulation_create_column_day_partitions('price_promo.ps_recommended_scenarios_stack_override',
	    ARRAY[p_scenario_id], _start_date, _end_date);

	-- Copy data from ps_recommended_stack_override_ia to ps_recommended_scenarios_stack_override
	_column_names := price_promo.fn_get_table_columns('price_promo', 'ps_recommended_scenarios_stack_override');

	_query := format('
        INSERT INTO price_promo.ps_recommended_scenarios_stack_override (%1$s)
        SELECT 
            %2$s
        FROM price_promo.ps_recommended_stack_override_ia
        WHERE promo_id = %3$s
    ', _column_names,
	    price_promo.fn_replace_values(
	        _column_names,
	        jsonb_build_object(
	            'promo_id', p_promo_id,
	            'scenario_id', p_scenario_id,
	            'user_id', p_user_id
	        )
	    ),
	    p_promo_id
	);
	raise notice 'query 5: %', _query;
	execute _query;

	-- Copy data from ps_recommended_stack_override_ia_agg to ps_recommended_scenarios_stack_override_agg
	_column_names := price_promo.fn_get_table_columns('price_promo', 'ps_recommended_scenarios_stack_override_agg');

	_query := format('
        INSERT INTO price_promo.ps_recommended_scenarios_stack_override_agg (%1$s)
        SELECT 
            %2$s
        FROM price_promo.ps_recommended_stack_override_ia_agg
        WHERE promo_id = %3$s
    ', _column_names,
	    price_promo.fn_replace_values(
	        _column_names,
	        jsonb_build_object(
	            'promo_id', p_promo_id,
	            'scenario_id', p_scenario_id,
	            'user_id', p_user_id
	        )
	    ),
	    p_promo_id
	);
	raise notice 'query 6: %', _query;
	execute _query;


    delete from price_promo.tb_promo_override_forecast where promo_id = p_promo_id and scenario_id = p_scenario_id;
    insert into price_promo.tb_promo_override_forecast 
    (
        promo_id,
        scenario_id,
        reason,
        overridden_by,
        comment,
        is_default,
        new_sales_units,
        old_sales_units,
        new_baseline_sales_units,
        old_baseline_sales_units,
        from_stacking_view
    )
    select 
        p_promo_id,
        p_scenario_id,
        reason,
        p_user_id,
        comment,
        is_default,
        new_sales_units,
        old_sales_units,
        new_baseline_sales_units,
        old_baseline_sales_units,
        from_stacking_view
    from price_promo.tb_promo_override_forecast
    where promo_id = p_promo_id and scenario_id = 0;

    UPDATE price_promo.ps_scenario_discounts
    SET scenario_data[_scenario_order_id::text] = scenario_data[_scenario_order_id::text] || jsonb_build_object(
                        'offer_x_type', ia_recommended_data->'0'->>'offer_x_type',
                        'offer_y_type', ia_recommended_data->'0'->>'offer_y_type',
                        'offer_z_type', ia_recommended_data->'0'->>'offer_z_type',
                        'offer_type_id', (ia_recommended_data->'0'->>'offer_type_id')::integer,
                        'offer_x_value', (ia_recommended_data->'0'->>'offer_x_value')::numeric,
                        'offer_y_value', (ia_recommended_data->'0'->>'offer_y_value')::numeric,
                        'offer_z_value', (ia_recommended_data->'0'->>'offer_z_value')::numeric,
                        'offer_type', ia_recommended_data->'0'->>'offer_type',
                        'offer_value', ia_recommended_data->'0'->>'offer_value',
						'tier_id', ia_recommended_data->'0'->>'tier_id',
						'special_offer_data', ia_recommended_data->'0'->>'special_offer_data'
                    )
    WHERE promo_id = p_promo_id;
		
	-- Update promo status to TO FINALIZE
    UPDATE price_promo.promo_master
    SET 
        status = 2,
        updated_by = p_user_id,
        updated_at = NOW(),
		last_approved_scenario_id = p_scenario_id
    WHERE promo_id = p_promo_id;
    
    RETURN true;

EXCEPTION WHEN OTHERS THEN
    -- Log the error
    RAISE NOTICE 'Error approving IA scenario: %', SQLERRM;
    RETURN false;
END;
$function$
;