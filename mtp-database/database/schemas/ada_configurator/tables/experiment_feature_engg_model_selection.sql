--liquibase formatted sql
--changeset raja.duraisamy@impactanalytics.co:experiment_feature_engg_model_selection_update6 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42740
--comment: initial changeset for experiment_feature_engg_model_selection_update

CREATE TABLE IF NOT EXISTS ada_configurator.experiment_feature_engg_model_selection (
	id serial4 NOT NULL,
	experiment_id int4 NULL,
	dependent_feature int4 NULL,
	data_points int4 NULL,
	dependent_var_limit int4 DEFAULT 0 NULL,
	CONSTRAINT experiment_feature_engg_model_selection_pkey PRIMARY KEY (id),
	CONSTRAINT experiment_feature_engg_model_selection_dependent_feature_fkey FOREIGN KEY (dependent_feature) REFERENCES ada_configurator.experiment_feature_imputation_config(id) ON DELETE CASCADE,
	CONSTRAINT experiment_feature_engg_model_selection_experiment_id_fkey FOREIGN KEY (experiment_id) REFERENCES ada_configurator.experiment_master(experiment_id) ON DELETE CASCADE
);

--changeset priyansh.gautam@impactanalytics.co:experiment_feature_engg_model_selection add_column_and_constarnit stripComments:false splitStatements:false context:initial_release labels:add_column_and_constarnit
--comment: add_column_and_constarnit
ALTER TABLE ada_configurator.experiment_feature_engg_model_selection
ADD COLUMN dependent_feature_lower int4 NULL,
ADD CONSTRAINT experiment_feature_engg_model_selection_dependent_feature_lower_fkey 
    FOREIGN KEY (dependent_feature_lower) 
    REFERENCES ada_configurator.lower_experiment_feature_imputation_config(id) 
    ON DELETE CASCADE;