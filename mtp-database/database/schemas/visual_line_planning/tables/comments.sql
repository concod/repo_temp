--liquibase formatted sql
--changeset liquibase:comments stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for comments
CREATE TABLE visual_line_planning."comments" (
	id uuid NOT NULL,
	media_item_id uuid NOT NULL,
	user_id uuid NOT NULL,
	"content" text NOT NULL,
	created_at timestamptz NOT NULL,
	updated_at timestamptz NOT NULL,
	parent_comment_id uuid NULL,
	is_edited bool DEFAULT false NOT NULL,
	is_resolved bool DEFAULT false NULL,
	CONSTRAINT comments_pkey PRIMARY KEY (id),
	CONSTRAINT comments_media_items_fk FOREIGN KEY (media_item_id) REFERENCES visual_line_planning.media_items(id) ON DELETE CASCADE
);
CREATE INDEX idx_comments_created_at ON visual_line_planning.comments USING btree (created_at DESC);
CREATE INDEX idx_comments_media_item_id ON visual_line_planning.comments USING btree (media_item_id);
CREATE INDEX idx_comments_parent_id ON visual_line_planning.comments USING btree (parent_comment_id);
CREATE INDEX idx_comments_user_id ON visual_line_planning.comments USING btree (user_id);

--changeset liquibase:comments_user_id_to_integer stripComments:false splitStatements:false context:Release_2_0 labels:change_user_id_to_integer
--comment: change the user_id from uuid to integer

DROP INDEX visual_line_planning.idx_comments_user_id;

ALTER TABLE visual_line_planning.comments DROP COLUMN user_id;
ALTER TABLE visual_line_planning.comments ADD COLUMN user_id integer NULL;

CREATE INDEX idx_comments_user_id ON visual_line_planning.comments USING btree (user_id);
