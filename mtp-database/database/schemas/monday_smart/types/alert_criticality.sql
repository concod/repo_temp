--liquibase formatted sql
--changeset sivaprasath.vadivel:alert_criticality stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42740
--comment: initial changeset for alert_criticality

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_criticality') THEN
	CREATE TYPE monday_smart."alert_criticality" AS ENUM (
		'high',
		'medium',
		'low'
	);
	END IF;
END
$$;