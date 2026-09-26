--liquibase formatted sql
--changeset shreyas.sankpal@impactanalytics.co:keyboard_shortcut_keys stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start_MTP-51135
--comment: initial changeset for keyboard_shortcut_keys
CREATE TABLE "global".keyboard_shortcut_keys (
	shortcut_keys_code serial4 NOT NULL,
	keys _text NULL,
	operating_system text NOT NULL,
	shortcut_action_code int4 NOT NULL,
	CONSTRAINT keyboard_shortcut_keys_pk PRIMARY KEY (shortcut_keys_code),
	CONSTRAINT keyboard_shortcut_keys_unique_key2 UNIQUE (keys, operating_system, shortcut_action_code),
	CONSTRAINT fk_shortcut_action_code FOREIGN KEY (shortcut_action_code) REFERENCES "global".keyboard_shortcut_actions(shortcut_action_code) ON DELETE CASCADE
);