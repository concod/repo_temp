--liquibase formatted sql
--changeset shreyas.sankpal@impactanalytics.co:keyboard_shortcut_actions stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start_MTP-51135
--comment: initial changeset for keyboard_shortcut_actions
CREATE TABLE "global".keyboard_shortcut_actions (
	shortcut_action_code serial4 NOT NULL,
	component text NOT NULL,
	button text NULL,
	action_label text NOT NULL,
	action_description text NULL,
	application_code int4 NULL,
	CONSTRAINT keyboard_shortcut_actions_pk PRIMARY KEY (shortcut_action_code),
	CONSTRAINT keyboard_shortcut_actions_unique_key UNIQUE (component, button, action_label, application_code)
);

--changeset shreyas.sankpal@impactanalytics.co:tooltip_info_new_column stripComments:false splitStatements:false context:Release_1_0 labels:tooltip_info
--comment: added column to store tooltip info
alter table global.keyboard_shortcut_actions add info_tooltip text null default null;