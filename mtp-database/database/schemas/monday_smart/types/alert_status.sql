--liquibase formatted sql
--changeset sivaprasath.vadivel:alert_status stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42740
--comment: initial changeset for alert_status

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_status') THEN
		CREATE TYPE monday_smart."alert_status" AS ENUM (
			'created',
			'completed',
			'triggered',
			'deleted',
			'paused',
			'reviewed'
		);
	END IF;
END
$$;