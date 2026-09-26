--liquibase formatted sql
--changeset arnab.nandy@impactanalytics.co:ticket_master stripComments:false splitStatements:false context:MTP-22854 labels:liquibase_project_start
--comment: creating table ticket_master
CREATE TABLE "global".ticket_master (
	id int4 NOT NULL,
	title text NULL,
	description text NULL,
	user_id int4 NULL,
	company_id int4 NULL,
	assigned_to_id int4 NULL,
	status varchar NOT NULL,
	priority varchar NOT NULL,
	ticket_queue_id int4 NULL,
	rating int4 NULL,
	rated_on timestamptz NULL DEFAULT now(),
	created_on timestamptz NULL DEFAULT now(),
	updated_on timestamptz NULL DEFAULT now(),
	status_changed_on timestamptz NULL DEFAULT now(),
	solved_on timestamptz NULL DEFAULT now(),
	assigned_on timestamptz NULL DEFAULT now(),
	first_assigned_on timestamptz NULL DEFAULT now(),
	due_on timestamptz NULL DEFAULT now(),
	closed_on timestamptz NULL DEFAULT now(),
	deleted_at timestamptz NULL DEFAULT now(),
	scheduled_on timestamptz NULL DEFAULT now(),
	is_attention_required bool NULL,
	ticket_form_id int4 NULL,
	resolution_id int4 NULL,
	CONSTRAINT ticket_master_pk PRIMARY KEY (id)
);

--changeset shreyan.haldankar@impactanalytics.co:adding_column_update_details_in_dev stripComments:false splitStatements:false context:Release_1_1 labels:MTP-32363
--comment: adding column update_details for keeping a record of recent activities
ALTER TABLE global.ticket_master ADD column if not EXISTS update_details TEXT NULL;