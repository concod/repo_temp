--liquibase formatted sql
--changeset liquibase:selected_rules stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for selected_rules
CREATE TABLE source_smart.selected_rules (
	subregion _text NOT NULL,
	facility_id varchar(255) NULL,
	strategy_name varchar(255) NULL,
	factors jsonb NULL,
	demand int4 NULL,
	last_cycle_demand int4 NULL,
	sourcing_type varchar(255) NULL,
	threshold int4 NULL,
	forecast_deviation numeric NULL,
	previous_allocated_factory_count int4 NULL,
	number_od_style_colors int4 NULL,
	allocation_id uuid NULL,
	operation_id uuid NULL,
	rule_id int4 NULL,
	"hierarchy" jsonb NULL,
	season_name varchar NULL,
	l0_name varchar NULL,
	forecast_version varchar NULL,
	CONSTRAINT selected_rules_unique UNIQUE (allocation_id, operation_id, rule_id)
);

--changeset mayank.mukundam@impactanalytics.co:selected_rules_index stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: create index on selected_rules
CREATE INDEX selected_rules_allocation_id_idx ON source_smart.selected_rules USING btree (allocation_id, operation_id, rule_id);