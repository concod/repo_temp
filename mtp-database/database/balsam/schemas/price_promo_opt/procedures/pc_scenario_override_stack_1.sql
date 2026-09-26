--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_scenario_override_stack_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_scenario_override_stack_1

DROP PROCEDURE if exists price_promo_opt.pc_scenario_override_stack_1;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_scenario_override_stack_1(IN _promo_id integer, IN _scenario_id integer, IN _multiplier numeric, IN _baseline_multiplier numeric, IN _user_id integer)
 LANGUAGE plpgsql
AS $procedure$ 

DECLARE

    -- Variables to store dynamic table names

    _reference_table_normal TEXT;

    _reference_table_stack TEXT;

    _destination_table_normal TEXT;

    _destination_table_stack TEXT;



    -- Variables for promo details and calculations

    _last_approved_scenario_id INT;

    _status INT;

    _min_start_date DATE;

    _max_start_date DATE;

    _overlap_promo_ids INT[];

    start_time TIMESTAMP;

    end_time TIMESTAMP;



BEGIN

    -- Step 1: Fetch last approved scenario ID and promo status from promo_master

    SELECT last_approved_scenario_id, status

    INTO _last_approved_scenario_id, _status

    FROM price_promo.promo_master

    WHERE promo_id = _promo_id;



    -- Step 2: Validate promo status

    IF _status NOT IN (4, 8) THEN

        -- If status is not approved or finalized, call insert procedure

        CALL price_promo_opt.pc_non_fin_scenario_override_stack_2(

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

        CALL price_promo_opt.pc_non_fin_scenario_override_stack_2(

            _promo_id, 

            _scenario_id, 

            _multiplier, 

            _baseline_multiplier, 

            _user_id

        );

    END IF;



    -- Step 4: Handle scenario ID match (override stacking logic)

    IF _status IN (4, 8) AND _scenario_id = _last_approved_scenario_id THEN

        -- If scenario ID matches, call the stacking override logic function

        CALL price_promo_opt.pc_fin_scenario_override_stack_3(

            _promo_id, 

            _scenario_id, 

            _multiplier, 

            _baseline_multiplier, 

            _user_id

        );

    END IF;



    -- Step 5: Log success

    RAISE NOTICE 'Procedure executed successfully for Promo ID: %, Scenario ID: %', _promo_id, _scenario_id;



END;

$procedure$



;