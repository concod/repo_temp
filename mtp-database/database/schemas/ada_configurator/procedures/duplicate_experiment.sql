--liquibase formatted sql
--changeset liquibase:duplicate_experiment1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42740
--comment: initial changeset for duplicate_experiment
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS ada_configurator.duplicate_experiment(int4, varchar, int4);

CREATE OR REPLACE PROCEDURE ada_configurator.duplicate_experiment(IN p_old_experiment_id integer, IN p_new_experiment_name character varying, IN p_user_id integer)
 LANGUAGE plpgsql
AS $procedure$
DECLARE
   v_new_experiment_id INTEGER;
   v_new_forecast_level_id INTEGER;
   rec RECORD;
   rec_level RECORD;
   rec_product_level RECORD;
   rec_store_level RECORD;
   rec_time_level RECORD;
BEGIN
   -- Duplicate experiment_master
   INSERT INTO ada_configurator.experiment_master (
       experiment_name,
       workstream_id,
       level,
       created_on,
       created_by,
       modified_date
   )
   SELECT
       p_new_experiment_name,
       workstream_id,
       level,
       NOW(),
       p_user_id,
       NOW()
   FROM
       ada_configurator.experiment_master
   WHERE
       experiment_id = p_old_experiment_id
   RETURNING experiment_id INTO v_new_experiment_id;
   -- Duplicate experimental_fmt_mapping
   INSERT INTO ada_configurator.experimental_fmt_mapping (
       experiment_id,
       fmt_table_name,
       fmt_creation_status,
       created_on,
       created_by
   )
   SELECT
       v_new_experiment_id,
       fmt_table_name,
       fmt_creation_status,
       NOW(),
       created_by
   FROM
       ada_configurator.experimental_fmt_mapping
   WHERE
       experiment_id = p_old_experiment_id;
   -- Duplicate experiment_feature_imputation_config
   FOR rec IN
       SELECT
           id,
           feature_name,
           feature_category,
           feature_type,
           feature_usage,
           encoding,
           elasticity_required,
           selection_criteria,
           transformation
       FROM
           ada_configurator.experiment_feature_imputation_config
       WHERE
           experiment_id = p_old_experiment_id
   LOOP
       INSERT INTO ada_configurator.experiment_feature_imputation_config (
           experiment_id,
           feature_name,
           feature_category,
           feature_type,
           feature_usage,
           encoding,
           elasticity_required,
           selection_criteria,
           transformation
       )
       VALUES (
           v_new_experiment_id,
           rec.feature_name,
           rec.feature_category,
           rec.feature_type,
           rec.feature_usage,
           rec.encoding,
           rec.elasticity_required,
           rec.selection_criteria,
           rec.transformation
       );
   END LOOP;
   -- Duplicate experiment_feature_elimation_selection_methods
   INSERT INTO ada_configurator.experiment_feature_elimation_selection_methods (
       elimation_id,
       experiment_id,
       threshold
   )
   SELECT
       elimation_id,
       v_new_experiment_id,
       threshold
   FROM
       ada_configurator.experiment_feature_elimation_selection_methods
   WHERE
       experiment_id = p_old_experiment_id;
   -- Duplicate experiment_model_train_test
   FOR rec IN
       SELECT
           train_test_param_id,
           parameter_value
       FROM
           ada_configurator.experiment_model_train_test
       WHERE
           experiment_id = p_old_experiment_id
   LOOP
       INSERT INTO ada_configurator.experiment_model_train_test (
           experiment_id,
           train_test_param_id,
           parameter_value
       )
       VALUES (
           v_new_experiment_id,
           rec.train_test_param_id,
           rec.parameter_value
       );
   END LOOP;
   -- Duplicate experiment_model_selection_config
   FOR rec IN
       SELECT
           model_parameter_id,
           parameter_value
       FROM
           ada_configurator.experiment_model_selection_config
       WHERE
           experiment_id = p_old_experiment_id
   LOOP
       INSERT INTO ada_configurator.experiment_model_selection_config (
           experiment_id,
           model_parameter_id,
           parameter_value
       )
       VALUES (
           v_new_experiment_id,
           rec.model_parameter_id,
           rec.parameter_value
       );
   END LOOP;
   -- Duplicate experiment_best_model_selection
   FOR rec IN
       SELECT
           model_id,
           value
       FROM
           ada_configurator.experiment_best_model_selection
       WHERE
           experiment_id = p_old_experiment_id
   LOOP
       INSERT INTO ada_configurator.experiment_best_model_selection (
           experiment_id,
           model_id,
           value
       )
       VALUES (
           v_new_experiment_id,
           rec.model_id,
           rec.value
       );
   END LOOP;
   -- Duplicate experiment_level
   FOR rec_level IN
       SELECT
           level_id,
           exp_level_type
       FROM
           ada_configurator.experiment_level
       WHERE
           experiment_id = p_old_experiment_id
   LOOP
       INSERT INTO ada_configurator.experiment_level (
           experiment_id,
           exp_level_type
       )
       VALUES (
           v_new_experiment_id,
           rec_level.exp_level_type
       )
       RETURNING level_id INTO v_new_forecast_level_id;
       -- Duplicate experiment_product_level_names
       FOR rec_product_level IN
           SELECT
               product_level_id,
               product_level_name,
               hierarchy,
               skip_level_flag
           FROM
               ada_configurator.experiment_product_level_names
           WHERE
               forecast_id = rec_level.level_id
       LOOP
           INSERT INTO ada_configurator.experiment_product_level_names (
               forecast_id,
               product_level_id,
               product_level_name,
               hierarchy,
               skip_level_flag
           )
           VALUES (
               v_new_forecast_level_id,
               rec_product_level.product_level_id,
               rec_product_level.product_level_name,
               rec_product_level.hierarchy,
               rec_product_level.skip_level_flag
           );
       END LOOP;
       -- Duplicate experiment_store_level_names
       FOR rec_store_level IN
           SELECT
               store_level_id,
               store_level_name,
               hierarchy,
               skip_level_flag
           FROM
               ada_configurator.experiment_store_level_names
           WHERE
               forecast_id = rec_level.level_id
       LOOP
           INSERT INTO ada_configurator.experiment_store_level_names (
               forecast_id,
               store_level_id,
               store_level_name,
               hierarchy,
               skip_level_flag
           )
           VALUES (
               v_new_forecast_level_id,
               rec_store_level.store_level_id,
               rec_store_level.store_level_name,
               rec_store_level.hierarchy,
               rec_store_level.skip_level_flag
           );
       END LOOP;
       -- Duplicate experiment_time_level_names
       FOR rec_time_level IN
           SELECT
               calendar_type,
               time_level_name,
               hierarchy,
               skip_level_flag
           FROM
               ada_configurator.experiment_time_level_names
           WHERE
               forecast_id = rec_level.level_id
       LOOP
           INSERT INTO ada_configurator.experiment_time_level_names (
               forecast_id,
               calendar_type,
               time_level_name,
               hierarchy,
               skip_level_flag
           )
           VALUES (
               v_new_forecast_level_id,
               rec_time_level.calendar_type,
               rec_time_level.time_level_name,
               rec_time_level.hierarchy,
               rec_time_level.skip_level_flag
           );
       END LOOP;
   END LOOP;
   -- Duplicate experiment_model_type_selection_configs
   FOR rec IN
       SELECT
           model_type_id,
           model_typeparameter_id,
           parameter_value
       FROM
           ada_configurator.experiment_model_type_selection_configs
       WHERE
           experiment_id = p_old_experiment_id
   LOOP
       INSERT INTO ada_configurator.experiment_model_type_selection_configs (
           experiment_id,
           model_type_id,
           model_typeparameter_id,
           parameter_value
       )
       VALUES (
           v_new_experiment_id,
           rec.model_type_id,
           rec.model_typeparameter_id,
           rec.parameter_value
       );
   END LOOP;
-- Duplicate experiment_feature_engg_model_selection
   FOR rec IN
       SELECT
           selection_criteria,
           dependent_feature,
           data_points,
           ensembling_flag,
           ensembling_technique_id
       FROM
           ada_configurator.experiment_feature_engg_model_selection
       WHERE
           experiment_id = p_old_experiment_id
   LOOP
       INSERT INTO ada_configurator.experiment_feature_engg_model_selection (
           experiment_id,
           selection_criteria,
           dependent_feature,
           data_points,
           ensembling_flag,
           ensembling_technique_id
       )
       VALUES (
           v_new_experiment_id,
           rec.selection_criteria,
           rec.dependent_feature,
           rec.data_points,
           rec.ensembling_flag,
           rec.ensembling_technique_id
       );
   END LOOP;
END;
$procedure$
;
