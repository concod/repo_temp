--liquibase formatted sql
--changeset liquibase:notes_event_user_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for notes_event_user_mapping
create table "global".notes_event_user_mapping (
	event_id Integer not null,
	created_by int4 null,
	constraint fk_event_id foreign key (event_id) references "global".notes_event_metadata(event_id) on delete cascade,
	constraint fk_created_by foreign key (created_by) references "global".user_master(user_code) ON DELETE SET NULL
);

alter table "global".notes_event_user_mapping add constraint unique_event_id_created_by UNIQUE(event_id, created_by);

--changeset kamalesh.k@impactanalytics.co:notes_event_user_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: primary key for notes_event_user_mapping

ALTER TABLE "global".notes_event_user_mapping
DROP CONSTRAINT IF EXISTS unique_event_id_created_by;

alter table "global".notes_event_user_mapping alter column created_by set not null;

ALTER TABLE "global".notes_event_user_mapping
ADD CONSTRAINT notes_event_user_mapping_pkey PRIMARY KEY (event_id, created_by);

--changeset abhishek.jha@impactanalytics.co:notes_event_user_mapping stripComments:false splitStatements:false context:Release_1_0 labels:MTP-107267
--comment: changing column name from created_by to member_id
alter table global.notes_event_user_mapping rename column created_by to member_id;


--changeset abhishek.jha@impact:notes_event_user_mapping stripComments:false splitStatements:false context:Release_1_0 labels:MTP-107267
--comment: added snoozed column
alter table global.notes_event_user_mapping add column is_snoozed bool default false;

