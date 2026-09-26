--liquibase formatted sql
--changeset raja.duraisamy@impactanalytics.co:experiement_modelling_level6 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42740
--comment: initial changeset for experiement_modelling_level1


DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'experiement_modelling_level') THEN
        CREATE TYPE ada_configurator.experiement_modelling_level AS ENUM (
  'High',
  'Lower',
  'StoreSplit',
  'SizeCurve',
  'DaySplit',
  'Clustering'
);
    END IF;
END
$$;