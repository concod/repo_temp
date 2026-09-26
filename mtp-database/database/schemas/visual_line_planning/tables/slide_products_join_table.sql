--liquibase formatted sql
--changeset liquibase:slide_products_join_table stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for slide_products_join_table
CREATE TABLE visual_line_planning.slide_products_join_table (
	slide_id uuid NOT NULL,
	lpp_id uuid NOT NULL,
	is_hidden bool DEFAULT false NULL,
	"position" int4 NULL,
	CONSTRAINT slpp_pkey PRIMARY KEY (slide_id, lpp_id),
	CONSTRAINT fk_lpp FOREIGN KEY (lpp_id) REFERENCES visual_line_planning.line_plan_products(line_plan_product_list_id) ON DELETE CASCADE,
	CONSTRAINT fk_slides FOREIGN KEY (slide_id) REFERENCES visual_line_planning.slides(slide_id) ON DELETE CASCADE
);

--changeset shannonnelson.d@impactanalytics.co:slide_products_join_table_add_presentation_id stripComments:false splitStatements:false context:Release_1_1 labels:schema_alignment
--comment: Add presentation_id column with foreign key to presentations table
ALTER TABLE visual_line_planning.slide_products_join_table 
ADD COLUMN presentation_id uuid NOT NULL;

ALTER TABLE visual_line_planning.slide_products_join_table 
ADD CONSTRAINT slide_products_join_table_presentations_fk 
FOREIGN KEY (presentation_id) 
REFERENCES visual_line_planning.presentations(presentation_id) 
ON DELETE CASCADE;

