--liquibase formatted sql
--changeset sivaprasath.vadivel:alerts_processor stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for alerts_processor
DO $$
BEGIN

	CREATE TABLE monday_smart.alerts_processor (
		id serial4 NOT NULL,
		kpi_code int4 NOT NULL,
		hotspot_alert bool DEFAULT false NULL,
		anomalous_alert bool DEFAULT false NULL,
		new_trend_alert bool DEFAULT false NULL,
		created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
		updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
		created_by varchar(255) NULL,
		updated_by varchar(255) NULL,
		kpi_score int4 DEFAULT 0 NULL,
		CONSTRAINT alerts_processor_pkey PRIMARY KEY (id),
		CONSTRAINT uk_alerts_processor_kpi UNIQUE (kpi_code),
		CONSTRAINT fk_alerts_processor_kpi FOREIGN KEY (kpi_code) REFERENCES monday_smart.kpis_master_v2(kpi_code) ON DELETE CASCADE
	);
	CREATE INDEX idx_alerts_processor_anomalous ON monday_smart.alerts_processor USING btree (anomalous_alert) WHERE (anomalous_alert = true);
	CREATE INDEX idx_alerts_processor_hotspot ON monday_smart.alerts_processor USING btree (hotspot_alert) WHERE (hotspot_alert = true);
	CREATE INDEX idx_alerts_processor_kpi_code ON monday_smart.alerts_processor USING btree (kpi_code);
	CREATE INDEX idx_alerts_processor_new_trend ON monday_smart.alerts_processor USING btree (new_trend_alert) WHERE (new_trend_alert = true);

	IF NOT EXISTS (SELECT 1 FROM pg_proc where proname = 'update_alerts_processor_updated_at' and pronamespace in (select oid from pg_namespace where nspname = 'monday_smart')) THEN

		CREATE FUNCTION monday_smart.update_alerts_processor_updated_at()
		RETURNS trigger
		LANGUAGE plpgsql
		AS $function$
		BEGIN
			NEW.updated_at = CURRENT_TIMESTAMP;
			RETURN NEW;
		END;
		$function$
		;

	END IF;

	create trigger trigger_update_alerts_processor_updated_at
	before update
	on monday_smart.alerts_processor
	for each row
	execute function monday_smart.update_alerts_processor_updated_at();

END
$$;