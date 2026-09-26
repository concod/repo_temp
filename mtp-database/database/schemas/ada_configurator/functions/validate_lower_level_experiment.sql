--liquibase formatted sql
--changeset liquibase:validate_lower_level_experiment1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42740
--comment: initial changeset for validate_lower_level_experiment
--rollback: SELECT 1

DROP FUNCTION IF EXISTS ada_configurator.validate_lower_level_experiment(int4);

CREATE OR REPLACE FUNCTION ada_configurator.validate_lower_level_experiment(exp_id integer)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    experiment_master_count INT;
	experiment_mapping_count INT;
    experimental_fmt_mapping_count INT;
    experiment_feature_imputation_config_count INT;
    experiment_feature_engg_model_selection_count INT;
    experiment_model_train_test_count INT;
    experiment_model_selection_config_count INT;
    experiment_model_type_selection_configs_count INT;
    product_level_count INT;
    store_level_count INT;
    time_level_count INT;
    validation_status TEXT;
BEGIN
    -- Retrieve counts from the various tables
    SELECT COUNT(*) INTO experiment_master_count
    FROM ada_configurator.experiment_master
    WHERE experiment_id = exp_id;

	SELECT COUNT(*) INTO experiment_mapping_count
	FROM ada_configurator.experiments_mapping
	WHERE experiment_id = exp_id;

    SELECT COUNT(*) INTO experimental_fmt_mapping_count
    FROM ada_configurator.experimental_fmt_mapping
    WHERE experiment_id = exp_id;

    SELECT COUNT(*) INTO experiment_feature_imputation_config_count
    FROM ada_configurator.lower_experiment_feature_imputation_config
    WHERE experiment_id = exp_id;

    SELECT COUNT(*) INTO experiment_feature_engg_model_selection_count
    FROM ada_configurator.experiment_feature_engg_model_selection
    WHERE experiment_id = exp_id;

    SELECT COUNT(*) INTO experiment_model_train_test_count
    FROM ada_configurator.experiment_model_train_test
    WHERE experiment_id = exp_id;

    SELECT COUNT(*) INTO experiment_model_selection_config_count
    FROM ada_configurator.experiment_model_selection_config
    WHERE experiment_id = exp_id;

    SELECT COUNT(*) INTO experiment_model_type_selection_configs_count
    FROM ada_configurator.experiment_model_type_selection_configs
    WHERE experiment_id = exp_id;

    -- Get product_level_count
    SELECT COUNT(DISTINCT ep.forecast_id) INTO product_level_count
    FROM ada_configurator.experiment_product_level_names ep
    WHERE ep.forecast_id IN (
        SELECT el.level_id
        FROM ada_configurator.experiment_level el
        WHERE el.experiment_id = exp_id
    );

    -- Get store_level_count
    SELECT COUNT(DISTINCT es.forecast_id) INTO store_level_count
    FROM ada_configurator.experiment_store_level_names es
    WHERE es.forecast_id IN (
        SELECT el.level_id
        FROM ada_configurator.experiment_level el
        WHERE el.experiment_id = exp_id
    );

    -- Get time_level_count
    SELECT COUNT(DISTINCT et.forecast_id) INTO time_level_count
    FROM ada_configurator.experiment_time_level_names et
    WHERE et.forecast_id IN (
        SELECT el.level_id
        FROM ada_configurator.experiment_level el
        WHERE el.experiment_id = exp_id
    );

    -- Determine validation status
    IF experiment_master_count = 1 AND
	   experiment_mapping_count =1 AND
	   experimental_fmt_mapping_count = 1 AND
       experiment_feature_imputation_config_count >= 1 AND
       experiment_feature_engg_model_selection_count >= 1 AND
       experiment_model_train_test_count >= 1 AND
       experiment_model_selection_config_count >= 1 AND
       experiment_model_type_selection_configs_count >= 1 AND
       (product_level_count > 0 OR
        store_level_count > 0 OR
        time_level_count > 0) THEN
        validation_status := 'Validation Passed';
    ELSE
        validation_status := 'Validation Failed';
    END IF;

    RETURN validation_status;
END;
$function$
;
