--liquibase formatted sql
--changeset raja.duraisamy@impactanalytics.co:experiment_training_status6 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42740
--comment: initial changeset for experiment_training_status

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'experiment_training_status') THEN
        CREATE TYPE ada_configurator.experiment_training_status AS ENUM (
 'To Do',
 'In Progress',
 'Completed',
 'Failed',
 'To Be Trained'
);
    END IF;
END
$$;