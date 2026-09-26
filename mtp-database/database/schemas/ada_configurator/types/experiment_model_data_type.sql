--liquibase formatted sql
--changeset raja.duraisamy@impactanalytics.co:experiment_model_data_type6 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42740
--comment: initial changeset for experiment_model_data_type1


DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'experiment_model_data_type') THEN
        CREATE TYPE ada_configurator.experiment_model_data_type AS ENUM (
  'ModelType',
  'MethodClass',
  'TrainTest',
  'KPIErrorMethod',
  'EliminationMethod',
  'SelectionCriteria',
  'EnsemblingTechnique',
  'DataPointsMin',
  'PCASelectionCriteria',
  'EliminationPCA',
  'EnsemblingRequired'
);
    END IF;
END
$$;