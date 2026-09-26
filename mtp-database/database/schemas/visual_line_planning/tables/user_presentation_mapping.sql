--liquibase formatted sql
--changeset liquibase:user_presentation_mapping_2 stripComments:false splitStatements:false context:Release_2_0 labels:liquibase_project_start
--comment: initial changeset for user_presentation_mapping
DROP TABLE IF EXISTS visual_line_planning.user_presentation_mapping CASCADE;
CREATE TABLE visual_line_planning.user_presentation_mapping (
	user_email varchar(255) NOT NULL,
	presentation_id uuid NOT NULL,
	lpp_ids _uuid DEFAULT ARRAY[]::uuid[] NULL,
	CONSTRAINT user_presentation_pkey PRIMARY KEY (user_email, presentation_id),
	CONSTRAINT fk_presentation FOREIGN KEY (presentation_id) REFERENCES visual_line_planning.presentations_mod(presentation_id) ON DELETE CASCADE
);

--changeset shannonnelson.d@impactanalytics.co:user_presentation_mapping_update_fk_2_1 stripComments:false splitStatements:false context:Release_2_1 labels:schema_alignment
--comment: Update foreign key reference from presentations_mod to presentations table
TRUNCATE TABLE visual_line_planning.user_presentation_mapping CASCADE;
ALTER TABLE visual_line_planning.user_presentation_mapping DROP CONSTRAINT fk_presentation;
ALTER TABLE visual_line_planning.user_presentation_mapping ADD CONSTRAINT fk_presentation FOREIGN KEY (presentation_id) REFERENCES visual_line_planning.presentations(presentation_id) ON DELETE CASCADE;