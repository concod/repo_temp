--liquibase formatted sql
--changeset sivaprasath.vadivel:alert_type stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42740
--comment: initial changeset for alert_type

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_type') THEN
	CREATE TYPE monday_smart."alert_type" AS ENUM (
		'custom_granular',
		'anomalous',
		'hotspot',
		'new_trend',
		'data_refresh',
		'system_status'
	);
	END IF;
END
$$;