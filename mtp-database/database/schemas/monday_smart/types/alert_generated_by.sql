--liquibase formatted sql
--changeset sivaprasath.vadivel:alert_generated_by stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42740
--comment: initial changeset for alert_generated_by

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_generated_by') THEN
	CREATE TYPE monday_smart."alert_generated_by" AS ENUM (
		'system',
		'user'
	);
	END IF;
END
$$;