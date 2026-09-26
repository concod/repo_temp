--liquibase formatted sql
--changeset liquibase:presentation_comments_2 stripComments:false splitStatements:false context:Release_2_0 labels:liquibase_project_start
--comment: initial changeset for presentation_comments
DROP TABLE IF EXISTS visual_line_planning.presentation_comments CASCADE;
CREATE TABLE visual_line_planning.presentation_comments (
	id uuid NOT NULL,
	product_id uuid NOT NULL,
	user_id uuid NULL,
	"content" text NOT NULL,
	parent_comment_id uuid NULL,
	created_at timestamptz NOT NULL,
	updated_at timestamptz NOT NULL,
	is_edited bool DEFAULT false NOT NULL,
	line_presentation_id uuid NOT NULL,
	is_resolved bool DEFAULT false NULL,
	CONSTRAINT presentation_comments_pkey PRIMARY KEY (id),
	CONSTRAINT comments_parent_comment_id_fkey FOREIGN KEY (parent_comment_id) REFERENCES visual_line_planning.presentation_comments(id) ON DELETE CASCADE,
	CONSTRAINT presentation_comments_presentations_fk FOREIGN KEY (line_presentation_id) REFERENCES visual_line_planning.presentations_mod(presentation_id) ON DELETE CASCADE
);
CREATE INDEX idx_presentation_comments_parent_id ON visual_line_planning.presentation_comments USING btree (parent_comment_id);

--changeset liquibase:presentation_comments_user_id_to_integer_3 stripComments:false splitStatements:false context:Release_3_0 labels:change_user_id_to_integer
--comment: change the user_id from uuid to integer

ALTER TABLE visual_line_planning.presentation_comments DROP COLUMN user_id;
ALTER TABLE visual_line_planning.presentation_comments ADD COLUMN user_id integer NULL;

--changeset shannonnelson.d@impactanalytics.co:presentation_comments_update_f_3_1 stripComments:false splitStatements:false context:Release_3_1 labels:schema_alignment
--comment: Update foreign key reference from presentations_mod to presentations table
TRUNCATE TABLE visual_line_planning.presentation_comments CASCADE;
ALTER TABLE visual_line_planning.presentation_comments DROP CONSTRAINT presentation_comments_presentations_fk;
ALTER TABLE visual_line_planning.presentation_comments ADD CONSTRAINT presentation_comments_presentations_fk FOREIGN KEY (line_presentation_id) REFERENCES visual_line_planning.presentations(presentation_id) ON DELETE CASCADE;