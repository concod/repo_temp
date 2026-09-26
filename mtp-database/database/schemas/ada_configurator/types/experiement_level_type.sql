--liquibase formatted sql
--changeset raja.duraisamy@impactanalytics.co:experiement_level_type8 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42740
--comment: initial changeset for experiement_level_type

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'experiement_level_type') THEN
        CREATE TYPE ada_configurator."experiement_level_type" AS ENUM (
            'forecast',
            'modelling',
            'targetoutput',
            'clustering',
            'level1',
            'level2',
            'level3',
            'Product_Lower',
            'Store_Lower',
            'Time_Lower',
            'Product_Higher',
            'Store_Higher',
            'Time_Higher'
        );
    END IF;
END
$$;
