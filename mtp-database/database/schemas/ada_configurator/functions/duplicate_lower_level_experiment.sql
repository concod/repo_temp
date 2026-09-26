--liquibase formatted sql
--changeset liquibase:duplicate_lower_level_experiment2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42740
--comment: initial changeset for duplicate_lower_level_experiment1
--rollback: SELECT 1

DROP FUNCTION IF EXISTS ada_configurator.duplicate_lower_level_experiment(varchar, int4, int4);

CREATE OR REPLACE FUNCTION ada_configurator.duplicate_lower_level_experiment(p_name character varying, p_source_exp_id integer, p_current_exp_id integer DEFAULT NULL::integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_new_exp_id INTEGER; --new exp id 
    v_source_exists BOOLEAN;
    v_current_exists BOOLEAN;
    v_exp_type VARCHAR(50);
	v_exp_name VARCHAR(255);
    v_original_destination_forecast_id INTEGER; -- p_source_exp_id destination
	v_original_source_forecast_id INTEGER; -- p_source_exp_id source
	v_new_destination_forecast_id INTEGER; -- new_exp destination
	v_new_source_forecast_id INTEGER; -- new_exp source
    
BEGIN
    -- Check if source experiment exists
    SELECT EXISTS(
        SELECT 1 FROM ada_configurator.experiment_master 
        WHERE experiment_id = p_source_exp_id AND is_deleted = FALSE
    ) INTO v_source_exists;
    
    IF NOT v_source_exists THEN
        RAISE EXCEPTION 'Source experiment with ID % does not exist', p_source_exp_id;
    END IF;
    
    -- Begin transaction
    BEGIN
        -- Check if we're creating a new experiment or updating an existing one
        IF p_current_exp_id IS NULL THEN
            -- Create a new experiment
            INSERT INTO ada_configurator.experiment_master (
                experiment_name,
				workstream_id,
                level,
                created_by,
                created_on,
				page_unique_id
            )
            SELECT 
                p_name,
				workstream_id,
                level,
                created_by,
                NOW(),
				page_unique_id
            FROM ada_configurator.experiment_master
            WHERE experiment_id = p_source_exp_id
            RETURNING experiment_id, experiment_name INTO v_new_exp_id, v_exp_name;
            
            IF v_new_exp_id IS NULL THEN
                RAISE EXCEPTION 'Failed to create new experiment';
            END IF;
        ELSE
            -- Check if current experiment exists
            SELECT EXISTS(
                SELECT 1 FROM ada_configurator.experiment_master 
                WHERE experiment_id = p_current_exp_id AND is_deleted = FALSE
            ) INTO v_current_exists;
            
            IF NOT v_current_exists THEN
                RAISE EXCEPTION 'Current experiment with ID % does not exist', p_current_exp_id;
            END IF;
            
            -- Use the existing experiment ID
            v_new_exp_id := p_current_exp_id;
            
			--delete the experiment
			DELETE FROM ada_configurator.experiment_master
			WHERE experiment_id = v_new_exp_id;
			-- Create a new experiment with same exp id
			INSERT INTO ada_configurator.experiment_master (
				experiment_id,
                experiment_name,
				workstream_id,
                level,
                created_by,
                created_on,
				page_unique_id
            )
            SELECT 
				v_new_exp_id,
                p_name,
				workstream_id,
                level,
                created_by,
                NOW(),
				page_unique_id
            FROM ada_configurator.experiment_master
            WHERE experiment_id = p_source_exp_id;
            -- Update the experiment name and timestamp
            UPDATE ada_configurator.experiment_master
            SET 
                modified_date = NOW()
            WHERE experiment_id = v_new_exp_id;
            
      
        END IF;

        -- Copy data from source experiment to the new/updated experiment
        -- get level_ids and generate level_ids for aggregation config save
		SELECT level_id INTO v_original_destination_forecast_id
		FROM ada_configurator.experiment_level
		WHERE exp_level_type::text LIKE '%Lower%' AND
		experiment_id = p_source_exp_id;

		SELECT level_id INTO v_original_source_forecast_id
		FROM ada_configurator.experiment_level
		WHERE exp_level_type::text LIKE '%Higher%' AND
		experiment_id = p_source_exp_id;

		INSERT INTO ada_configurator.experiment_level(experiment_id, exp_level_type)
		SELECT v_new_exp_id, exp_level_type FROM ada_configurator.experiment_level
		WHERE level_id = v_original_destination_forecast_id
		RETURNING level_id INTO v_new_destination_forecast_id;

		INSERT INTO ada_configurator.experiment_level(experiment_id, exp_level_type)
		SELECT v_new_exp_id, exp_level_type FROM ada_configurator.experiment_level
		WHERE level_id = v_original_source_forecast_id
		RETURNING level_id INTO v_new_source_forecast_id;

		-- save the destination aggregations
		INSERT INTO ada_configurator.experiment_product_level_names
		(forecast_id, product_level_id, hierarchy, skip_level_flag, product_level_name)
		SELECT v_new_destination_forecast_id, product_level_id, hierarchy, skip_level_flag, product_level_name
        FROM ada_configurator.experiment_product_level_names
        WHERE forecast_id = v_original_destination_forecast_id;

		INSERT INTO ada_configurator.experiment_store_level_names
		(forecast_id, store_level_id, hierarchy, skip_level_flag, store_level_name)
		SELECT v_new_destination_forecast_id, store_level_id, hierarchy, skip_level_flag, store_level_name
        FROM ada_configurator.experiment_store_level_names
        WHERE forecast_id = v_original_destination_forecast_id;

		INSERT INTO ada_configurator.experiment_time_level_names
		(forecast_id, calendar_type, hierarchy, skip_level_flag, time_level_name)
		SELECT v_new_destination_forecast_id, calendar_type, hierarchy, skip_level_flag, time_level_name
        FROM ada_configurator.experiment_time_level_names
        WHERE forecast_id = v_original_destination_forecast_id;

		-- save the source aggregations
		INSERT INTO ada_configurator.experiment_product_level_names
		(forecast_id, product_level_id, hierarchy, skip_level_flag, product_level_name)
		SELECT v_new_source_forecast_id, product_level_id, hierarchy, skip_level_flag, product_level_name
        FROM ada_configurator.experiment_product_level_names
        WHERE forecast_id = v_original_source_forecast_id;

		INSERT INTO ada_configurator.experiment_store_level_names
		(forecast_id, store_level_id, hierarchy, skip_level_flag, store_level_name)
		SELECT v_new_source_forecast_id, store_level_id, hierarchy, skip_level_flag, store_level_name
        FROM ada_configurator.experiment_store_level_names
        WHERE forecast_id = v_original_source_forecast_id;

		INSERT INTO ada_configurator.experiment_time_level_names
		(forecast_id, calendar_type, hierarchy, skip_level_flag, time_level_name)
		SELECT v_new_source_forecast_id, calendar_type, hierarchy, skip_level_flag, time_level_name
        FROM ada_configurator.experiment_time_level_names
        WHERE forecast_id = v_original_source_forecast_id;

		-- Copy experiment mappings
		INSERT INTO ada_configurator.experiments_mapping(experiment_id, mapped_to_exp_id)
		SELECT v_new_exp_id, mapped_to_exp_id
		FROM  ada_configurator.experiments_mapping
		WHERE experiment_id = p_source_exp_id;

		-- Copy fmt mappings
		INSERT INTO ada_configurator.experimental_fmt_mapping(experiment_id, fmt_metadata_id, storage_location, storage_path, fmt_creation_status, created_on, created_by)
		SELECT v_new_exp_id, fmt_metadata_id, storage_location, storage_path, fmt_creation_status, created_on, created_by
		FROM ada_configurator.experimental_fmt_mapping
		WHERE experiment_id = p_source_exp_id;

		-- Copy feature transformation and normalization
		INSERT INTO ada_configurator.lower_experiment_feature_imputation_config(experiment_id, feature_name, feature_category, feature_type, feature_usage, encoding, elasticity_required, selection_criteria, transformation, feature_id)
		SELECT v_new_exp_id, feature_name, feature_category, feature_type, feature_usage, encoding, elasticity_required, selection_criteria, transformation, feature_id
		FROM ada_configurator.lower_experiment_feature_imputation_config
		WHERE experiment_id = p_source_exp_id;

		INSERT INTO ada_configurator.experiment_feature_engg_model_selection(experiment_id, dependent_feature, data_points, dependent_var_limit, dependent_feature_lower)
		SELECT v_new_exp_id, dependent_feature, data_points, dependent_var_limit, dependent_feature_lower
		FROM ada_configurator.experiment_feature_engg_model_selection
		WHERE experiment_id = p_source_exp_id;

		-- Copy feature reduction
		INSERT INTO ada_configurator.experiment_feature_elimation_selection_methods(experiment_id, feature_id, elimation_id, threshold)
		SELECT v_new_exp_id, feature_id, elimation_id, threshold
		FROM ada_configurator.experiment_feature_elimation_selection_methods
		WHERE experiment_id = p_source_exp_id;

		INSERT INTO ada_configurator.experiment_model_selection_data_dropdown(experiment_id, model_selection_data_id)
		SELECT v_new_exp_id, model_selection_data_id
		FROM ada_configurator.experiment_model_selection_data_dropdown
		WHERE experiment_id = p_source_exp_id;

		-- Copy model selection

		INSERT INTO ada_configurator.experiment_model_selection_config(experiment_id, model_parameter_id, parameter_value)
		SELECT v_new_exp_id, model_parameter_id, parameter_value
		FROM ada_configurator.experiment_model_selection_config
		WHERE experiment_id = p_source_exp_id;

		INSERT INTO ada_configurator.experiment_model_type_selection_configs(experiment_id, model_type_id, model_typeparameter_id, parameter_value)
		SELECT v_new_exp_id, model_type_id, model_typeparameter_id, parameter_value
		FROM ada_configurator.experiment_model_type_selection_configs
		WHERE experiment_id = p_source_exp_id;

		-- Copy train test split
		INSERT INTO ada_configurator.experiment_model_train_test(experiment_id, train_test_param_id, parameter_value)
		SELECT v_new_exp_id, train_test_param_id, parameter_value
		FROM ada_configurator.experiment_model_train_test
		WHERE experiment_id = p_source_exp_id;

		-- Copy Best Model Selection 
		INSERT INTO ada_configurator.experiment_best_model_selection(experiment_id, model_id, value, selection_type, is_user_locked)
		SELECT v_new_exp_id, model_id, value, selection_type, is_user_locked
		FROM ada_configurator.experiment_best_model_selection
		WHERE experiment_id = p_source_exp_id;

		-- Copy Completed
        RETURN v_new_exp_id;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE EXCEPTION 'Error duplicating experiment: %', SQLERRM;
    END;
END;
$function$
;