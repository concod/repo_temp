--liquibase formatted sql
--changeset liquibase:media_items stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for media_items
CREATE TABLE visual_line_planning.media_items (
	id uuid NOT NULL,
	item_type text NOT NULL,
	"position" jsonb NOT NULL,
	"size" jsonb NOT NULL,
	url text NULL,
	text_content text NULL,
	text_color text NULL,
	item_data jsonb NOT NULL,
	subboard_id uuid NOT NULL,
	"index" int4 NOT NULL,
	"source" text NULL,
	media_items_id uuid NULL,
	CONSTRAINT media_items_pkey PRIMARY KEY (id),
	CONSTRAINT media_items_line_plan_products_fk FOREIGN KEY (media_items_id) REFERENCES visual_line_planning.line_plan_products(line_plan_product_list_id) ON DELETE CASCADE,
	CONSTRAINT media_items_subboards_fk FOREIGN KEY (subboard_id) REFERENCES visual_line_planning.subboards(id) ON DELETE CASCADE
);
CREATE INDEX idx_media_items_index ON visual_line_planning.media_items USING btree (subboard_id, index);
CREATE INDEX idx_media_items_subboard_id ON visual_line_planning.media_items USING btree (subboard_id);

--changeset shannonnelson.d@impactanalytics.co:add_media_items_object_path stripComments:false splitStatements:false context:Release_1_1 labels:object_path_added
--comment: updated changeset for get_line_plan_details_by_id_v2 - added object_path column
ALTER TABLE visual_line_planning.media_items
ADD COLUMN object_path text NULL;