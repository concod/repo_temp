--liquibase formatted sql
--changeset sivaprasath.vadivel:notification_channel stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for notification_channel

DO $$
BEGIN
	CREATE TABLE monday_smart.notification_channel (
		id bigserial NOT NULL,
		notification_id int8 NULL,
		channel monday_smart."conditional_notification_channels" NULL,
		created_at timestamptz NULL,
		metadata json NULL,
		status monday_smart."conditional_notification_channel_status" NULL,
		scheduled_at timestamptz NULL,
		CONSTRAINT notification_channel_pkey PRIMARY KEY (id),
		CONSTRAINT notification_channel_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES monday_smart.notifications(id)
	);

	IF NOT EXISTS (SELECT 1 FROM pg_proc where proname = 'set_created_at' and pronamespace in (select oid from pg_namespace where nspname = 'monday_smart')) THEN

	CREATE FUNCTION monday_smart.set_created_at()
	RETURNS trigger
	LANGUAGE plpgsql
	AS $function$
	BEGIN
		NEW.created_at = NOW();
		RETURN NEW;
	END;
	$function$
	;

	END IF;

	create trigger set_created_at_trigger
	before insert
	on monday_smart.notification_channel
	for each row
	execute function monday_smart.set_created_at();

END
$$;