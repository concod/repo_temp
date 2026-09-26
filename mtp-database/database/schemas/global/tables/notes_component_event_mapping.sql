--liquibase formatted sql
--changeset liquibase:notes_component_event_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for notes_component_event_mapping
CREATE TABLE "global".notes_component_event_mapping (
    hashed_component_id TEXT NOT NULL,
    sub_component TEXT NOT NULL,
    event_id INTEGER NOT NULL,
    UNIQUE (hashed_component_id, sub_component, event_id),
    CONSTRAINT fk_event_id
        FOREIGN KEY (event_id) REFERENCES "global".notes_event_metadata(event_id) ON DELETE CASCADE
);

CREATE INDEX idx_hashed_component_id ON "global".notes_component_event_mapping (hashed_component_id);

alter table "global".notes_component_event_mapping add column component_id text default null;
alter table "global".notes_component_event_mapping add column component_type text default null;
alter table "global".notes_component_event_mapping add column component_name text default null;

--changeset kamalesh.k@impactanalytics.co:notes_component_event_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: primary key for notes_component_event_mapping

ALTER TABLE "global".notes_component_event_mapping
DROP CONSTRAINT IF EXISTS notes_component_event_mapping_hashed_component_id_sub_compo_key;

ALTER TABLE "global".notes_component_event_mapping
ADD CONSTRAINT notes_component_event_mapping_pkey PRIMARY KEY (hashed_component_id, sub_component, event_id);