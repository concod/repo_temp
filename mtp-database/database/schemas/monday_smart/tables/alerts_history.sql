--liquibase formatted sql
--changeset sivaprasath.vadivel:alerts_history stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for alerts_history
DO $$
BEGIN
	CREATE TABLE monday_smart.alerts_history (
		id bigserial NOT NULL,
		alerts_id int8 NOT NULL,
		causal_summary json NULL,
		metadata jsonb NULL,
		triggered_at timestamptz NULL,
		sent_at timestamptz NULL,
		seen_at timestamptz NULL,
		kpi_result jsonb NULL,
		created_at timestamptz NULL
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
	on monday_smart.alerts_history
	for each row
	execute function monday_smart.set_created_at();

	ALTER TABLE monday_smart.alerts_history ADD CONSTRAINT alerts_history_alerts_id_fkey FOREIGN KEY (alerts_id) REFERENCES monday_smart.alerts(id);

END
$$;

--changeset sivaprasath.vadivel:alerts_history_update stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: changing the datatype of causal_summary column to varchar

ALTER TABLE monday_smart.alerts_history ALTER COLUMN causal_summary TYPE varchar using causal_summary::text;