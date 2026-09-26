--liquibase formatted sql
--changeset abhishek.jha@impactanalytics.co:notes_event_member_history stripComments:false splitStatements:false context:Release_1_0 labels:MTP-107267
--comment: initial changeset for notes_event_member_history
CREATE TABLE "global".notes_event_member_history (
    id BIGSERIAL PRIMARY KEY,
	event_id int4 NOT NULL,
	member_id int4 NOT NULL,
	action_type text DEFAULT 'added'::text NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT notes_event_user_mapping_action_type_check CHECK ((action_type = ANY (ARRAY['added'::text, 'removed'::text])))
);

ALTER TABLE "global".notes_event_member_history ADD CONSTRAINT fk_created_by FOREIGN KEY (member_id) REFERENCES "global".user_master(user_code) ON DELETE SET NULL;
ALTER TABLE "global".notes_event_member_history ADD CONSTRAINT fk_event_id FOREIGN KEY (event_id) REFERENCES "global".notes_event_metadata(event_id) ON DELETE CASCADE;


