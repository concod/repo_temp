--liquibase formatted sql
--changeset liquibase:presentation_slide_join_table stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for presentation_slide_join_table
CREATE TABLE visual_line_planning.presentation_slide_join_table (
	presentation_id uuid NOT NULL,
	slide_id uuid NOT NULL,
	CONSTRAINT ps_pkey PRIMARY KEY (presentation_id, slide_id),
	CONSTRAINT fk_presentation FOREIGN KEY (presentation_id) REFERENCES visual_line_planning.presentations_mod(presentation_id) ON DELETE CASCADE,
	CONSTRAINT fk_slide FOREIGN KEY (slide_id) REFERENCES visual_line_planning.slides(slide_id) ON DELETE CASCADE
);

--changeset shannonnelson.d@impactanalytics.co:presentation_slide_join_table_update_fk stripComments:false splitStatements:false context:Release_1_1 labels:schema_alignment
--comment: Update foreign key reference from presentations_mod to presentations table
TRUNCATE TABLE visual_line_planning.presentation_slide_join_table CASCADE;
ALTER TABLE visual_line_planning.presentation_slide_join_table DROP CONSTRAINT fk_presentation;
ALTER TABLE visual_line_planning.presentation_slide_join_table ADD CONSTRAINT fk_presentation FOREIGN KEY (presentation_id) REFERENCES visual_line_planning.presentations(presentation_id) ON DELETE CASCADE;