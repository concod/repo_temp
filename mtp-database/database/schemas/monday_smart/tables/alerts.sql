--liquibase formatted sql
--changeset sivaprasath.vadivel:alerts_update_new stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Updated changeset for alerts
DO $$
BEGIN

	CREATE TABLE monday_smart.alerts (
		id bigserial NOT NULL,
		title varchar NULL,
		is_recurring bool NULL,
		kpi varchar NULL,
		"condition" jsonb NULL,
		filters jsonb NULL,
		generated_by monday_smart."alert_generated_by" NULL,
		status monday_smart."alert_status" NULL,
		latest_causal_summary varchar NULL,
		last_triggered_at timestamptz NULL,
		last_sent_at timestamptz NULL,
		last_seen_at timestamptz NULL,
		created_at timestamptz NULL,
		updated_at timestamptz NULL,
		user_code int8 NULL,
		latest_metadata jsonb NULL,
		score float8 NULL,
		criticality monday_smart."alert_criticality" NULL,
		description varchar NULL,
		"type" monday_smart."alert_type" NULL,
		is_enabled boolean NULL,
		CONSTRAINT alerts_pkey PRIMARY KEY (id)
	);
	CREATE UNIQUE INDEX idx_user_id_title ON monday_smart.alerts USING btree (user_code, title) WHERE (type = 'custom_granular'::monday_smart.alert_type);
	ALTER TABLE monday_smart.alerts ADD CONSTRAINT alerts_user_code_fkey FOREIGN KEY (user_code) REFERENCES "global".user_master(user_code);
	
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
	on monday_smart.alerts
	for each row
	execute function monday_smart.set_created_at();

END
$$;
