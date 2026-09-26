--liquibase formatted sql
--changeset liquibase:trigger_duplicate_experiment5 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42740
--comment: initial changeset for trigger_duplicate_experiment
--rollback: SELECT 1

DROP FUNCTION IF EXISTS ada_configurator.trigger_duplicate_experiment(varchar, int4, int4, int4, varchar);

CREATE OR REPLACE FUNCTION ada_configurator.trigger_duplicate_experiment(p_exp_type character varying, p_source_exp_id integer, p_user_id integer, p_current_exp_id integer DEFAULT NULL::integer, p_name character varying DEFAULT NULL::character varying)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_source_exists BOOLEAN;
    v_exp_name VARCHAR(255);
    v_new_exp_id INTEGER;
    
BEGIN
    -- check input
    IF p_name IS NULL AND p_current_exp_id IS NULL THEN 
         RAISE EXCEPTION 'Input name and target exp id can not be null';
    END IF;
    
    -- check same name exp
    IF p_name IS NOT NULL THEN
        SELECT EXISTS(
            SELECT 1 FROM ada_configurator.experiment_master 
            WHERE experiment_name = p_name AND is_deleted = FALSE
            AND level::text = p_exp_type
        ) INTO v_source_exists;
        
        IF v_source_exists THEN
            RAISE EXCEPTION 'Experiment with same name already exists';
        END IF;
    END IF;
    
    -- check if p_source_exp_id exist or not
    SELECT EXISTS(
        SELECT 1 FROM ada_configurator.experiment_master 
        WHERE experiment_id = p_source_exp_id AND is_deleted = FALSE
    ) INTO v_source_exists;
    
    IF NOT v_source_exists THEN
        RAISE EXCEPTION 'Source experiment with ID % does not exist', p_source_exp_id;
    END IF;
  
    -- if exp_id is present, save the name
    IF p_name IS NULL THEN
        SELECT experiment_name INTO v_exp_name
        FROM ada_configurator.experiment_master
        WHERE experiment_id = p_current_exp_id;
    ELSE
        v_exp_name := p_name;
    END IF;
    
    -- call the function for duplicating
    IF p_exp_type = 'Lower' THEN
        SELECT * FROM ada_configurator.duplicate_lower_level_experiment(v_exp_name, p_source_exp_id, p_current_exp_id) INTO v_new_exp_id;
    ELSE
        RAISE EXCEPTION 'Lower exp duplication supported.';
    END IF;

	-- Update the experiment with new user_id
	IF p_current_exp_id IS NULL THEN
		UPDATE ada_configurator.experiment_master
		SET created_by = p_user_id
		WHERE experiment_id = v_new_exp_id;
	END IF;

    RETURN v_new_exp_id;
        
    EXCEPTION
        WHEN OTHERS THEN
            --Rollback transaction in case of error
            RAISE EXCEPTION 'Error duplicating experiment: %', SQLERRM;
    END;
$function$
;
