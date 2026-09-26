--liquibase formatted sql
--changeset liquibase:presentation_line_plan_join_table stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for presentation_line_plan_join_table
CREATE TABLE visual_line_planning.presentation_line_plan_join_table (
	presentation_id uuid NOT NULL,
	line_plan_id uuid NOT NULL,
	CONSTRAINT pl_key PRIMARY KEY (presentation_id, line_plan_id),
	CONSTRAINT fk_lp FOREIGN KEY (line_plan_id) REFERENCES visual_line_planning.line_plan(line_plan_id) ON DELETE CASCADE,
	CONSTRAINT fk_presentation FOREIGN KEY (presentation_id) REFERENCES visual_line_planning.presentations_mod(presentation_id) ON DELETE CASCADE
);

--changeset shannonnelson.d@impactanalytics.co:presentation_line_plan_join_table_update_fk stripComments:false splitStatements:false context:Release_1_1 labels:schema_alignment
--comment: Update foreign key reference from presentations_mod to presentations table
TRUNCATE TABLE visual_line_planning.presentation_line_plan_join_table CASCADE;
ALTER TABLE visual_line_planning.presentation_line_plan_join_table DROP CONSTRAINT fk_presentation;
ALTER TABLE visual_line_planning.presentation_line_plan_join_table ADD CONSTRAINT fk_presentation FOREIGN KEY (presentation_id) REFERENCES visual_line_planning.presentations(presentation_id) ON DELETE CASCADE;