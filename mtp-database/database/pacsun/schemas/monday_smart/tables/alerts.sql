--liquibase formatted sql
--changeset pranavkumar.singh@impactanalytics.co:alerts stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for alerts



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
	is_enabled bool NULL,
	CONSTRAINT alerts_pkey PRIMARY KEY (id)
);
CREATE UNIQUE INDEX idx_user_id_title ON monday_smart.alerts USING btree (user_code, title) WHERE (type = 'custom_granular'::monday_smart.alert_type);

-- Table Triggers

create trigger set_created_at_trigger before
insert
    on
    monday_smart.alerts for each row execute function monday_smart.set_created_at();


ALTER TABLE monday_smart.alerts ADD CONSTRAINT alerts_user_code_fkey FOREIGN KEY (user_code) REFERENCES "global".user_master(user_code);

--changeset pranavkumar.singh@impactanalytics.co:alerts_update stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for alerts_update
ALTER TABLE monday_smart.alerts ADD COLUMN currency_code TEXT default 'USD';

