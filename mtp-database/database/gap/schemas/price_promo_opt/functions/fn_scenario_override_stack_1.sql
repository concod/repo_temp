--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:fn_scenario_override_stack_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for fn_scenario_override_stack_1

DROP FUNCTION if exists price_promo_opt.fn_scenario_override_stack_1;
CREATE OR REPLACE FUNCTION price_promo_opt.fn_scenario_override_stack_1(_promo_id integer, _scenario_id integer, _multiplier numeric, _baseline_multiplier numeric, _user_id integer)
 RETURNS integer[]
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE

    -- Variables to store dynamic table names

    _reference_table_normal TEXT;

    _reference_table_stack TEXT;

    _destination_table_normal TEXT;

    _destination_table_stack TEXT;

	_query TEXT;

    -- Variables for promo details and calculations

    _last_approved_scenario_id INT;

    _status INT;

    _start_date DATE;

    _end_date DATE;

    _refresh_promo_id INT[] := ARRAY[]::INT[]; -- Default to empty array

    start_time TIMESTAMP;

    end_time TIMESTAMP;



BEGIN





	-- Step 0: Fetch last approved scenario ID and promo status from promo_master

    SELECT last_approved_scenario_id, status, start_date, end_date

    INTO _last_approved_scenario_id, _status, _start_date, _end_date

    FROM price_promo.promo_master

    WHERE promo_id = _promo_id;



	--STEP 1 Precreate partition if not exists.

    IF _scenario_id <> 0 THEN

	    CALL price_promo_opt.pc_simulation_create_column_day_partitions('price_promo.ps_recommended_override',

	    ARRAY[_scenario_id], _start_date, _end_date);

	   	CALL price_promo_opt.pc_simulation_create_column_day_partitions('price_promo.ps_recommended_scenarios_stack_override',

	    ARRAY[_scenario_id], _start_date, _end_date);

	ELSE

	    CALL price_promo_opt.pc_simulation_create_column_day_partitions('price_promo.ps_recommended_override_ia',

	    ARRAY[_promo_id], _start_date, _end_date);

	    CALL price_promo_opt.pc_simulation_create_column_day_partitions('price_promo.ps_recommended_stack_override_ia',

	    ARRAY[_promo_id], _start_date, _end_date);

	END IF ;







    -- Step 2: Validate promo status

    IF _status NOT IN (4, 8) THEN

        -- If status is not approved or finalized, call insert procedure

        PERFORM price_promo_opt.fn_scenario_override_stack_2(

            _promo_id,

            _scenario_id,

            _multiplier,

            _baseline_multiplier,

            _user_id

        );



    END IF;



    -- Step 3: Handle not approved scenario ID

    IF _status IN (4, 8) AND _scenario_id != _last_approved_scenario_id THEN

        -- If scenario ID does not match the last approved scenario, call insert procedure

        PERFORM price_promo_opt.fn_scenario_override_stack_2(

            _promo_id,

            _scenario_id,

            _multiplier,

            _baseline_multiplier,

            _user_id

        );

    END IF;



    -- Step 4: Handle scenario ID match (override stacking logic)

    IF _status IN (4, 8) AND _scenario_id = _last_approved_scenario_id THEN



	   	CALL price_promo_opt.pc_simulation_create_column_day_partitions('price_promo.ps_recommended_finalized_override',

	    ARRAY[_promo_id], _start_date, _end_date);



        PERFORM price_promo_opt.fn_scenario_override_stack_3_1(

            _promo_id,

            _scenario_id,

            _multiplier,

            _baseline_multiplier,

            _user_id

        );



       _refresh_promo_id := price_promo_opt.fn_scenario_override_stack_3_2(

	        _promo_id,

	        _scenario_id,

	        _multiplier,

	        _baseline_multiplier,

	        _user_id

	    );

    RAISE NOTICE 'Resulting promo_ids: %', _refresh_promo_id;

    END IF;



    -- Step 5: Log success

    RAISE NOTICE 'Function executed successfully for Promo ID: %, Scenario ID: %', _promo_id, _scenario_id;



    -- Return the list of promo IDs to be refreshed

    RETURN _refresh_promo_id;



END;

$function$
;

