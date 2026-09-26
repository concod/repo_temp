--liquibase formatted sql
--changeset sivaprasath.vadivel:notifications_create stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for notifications
DO $$
BEGIN

	CREATE TABLE monday_smart.notifications (
		id bigserial NOT NULL,
		title varchar(50) NULL,
		body varchar NULL,
		"type" monday_smart."conditional_notification_type" NULL,
		status monday_smart."conditional_notification_status" NULL,
		causal_summary varchar NULL,
		created_at timestamptz NULL,
		user_code int8 NULL,
		description text NULL,
		metadata json NULL,
		scheduled_at timestamptz NULL,
		CONSTRAINT notifications_pkey PRIMARY KEY (id)
	);
	CREATE INDEX idx_notifications_created_at ON monday_smart.notifications USING btree (user_code, created_at DESC);

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
	on monday_smart.notifications
	for each row
	execute function monday_smart.set_created_at();

END
$$;