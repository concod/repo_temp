
--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_strategy_status_level_v3 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_strategy_status_level_v3

CREATE TABLE base_pricing.bp_strategy_status_level (
	strategy_status_id int2 NOT NULL,
	strategy_status_value varchar(255) NOT NULL,
	strategy_status_display_name varchar(255) NOT NULL,
	strategy_status_description text NULL,
	is_editable bool DEFAULT true NULL,
	is_deletable bool DEFAULT true NULL,
	is_refreshable bool DEFAULT true NULL,
	is_cloneable bool DEFAULT true NULL,
	is_redirectable bool DEFAULT true NULL,
	alert_modal_trigger_status bool DEFAULT true NULL,
	has_action_buttons bool DEFAULT true NULL,
	show_in_workbench_summary_cards bool DEFAULT true NULL,
	is_workbench_default_filter bool DEFAULT true NULL,
	is_dashboard_default_filter bool DEFAULT true NULL,
	visible_on_screen _varchar NULL,
	is_active bool DEFAULT true NULL,
	created_at timestamp DEFAULT now() NULL,
	updated_at timestamp DEFAULT now() NULL,
	CONSTRAINT bp_strategy_status_level_pkey PRIMARY KEY (strategy_status_id)
);