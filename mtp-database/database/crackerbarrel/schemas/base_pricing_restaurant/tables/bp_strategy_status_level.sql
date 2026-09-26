--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_strategy_status_level stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_strategy_status_level

CREATE TABLE base_pricing_restaurant.bp_strategy_status_level (
	strategy_status_id int2 NOT NULL,
	strategy_status_value varchar(255) NOT NULL,
	strategy_status_display_name varchar(255) NOT NULL,
	strategy_status_description text NULL,
	is_active bool DEFAULT true NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	visible_on_screen _varchar NULL,
	is_editable bool DEFAULT true NULL,
	is_deletable bool DEFAULT true NULL,
	alert_modal_trigger_status bool DEFAULT true NULL,
	is_redirectable bool DEFAULT false NULL,
	has_action_buttons bool DEFAULT false NULL,
	is_refreshable bool DEFAULT false NULL,
	is_cloneable bool DEFAULT false NULL,
	show_in_workbench_summary_cards bool DEFAULT false NOT NULL,
	-- Additional columns from TEST environment
	is_workbench_default_filter bool DEFAULT true NULL,
	is_dashboard_default_filter bool DEFAULT true NULL,
	CONSTRAINT bp_strategy_status_level_pkey PRIMARY KEY (strategy_status_id)
);