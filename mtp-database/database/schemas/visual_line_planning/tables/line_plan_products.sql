--liquibase formatted sql
--changeset liquibase:line_plan_products stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for line_plan_products
CREATE TABLE visual_line_planning.line_plan_products (
	line_plan_product_list_id uuid DEFAULT gen_random_uuid() NOT NULL,
	line_plan_id uuid NOT NULL,
	product_id varchar(255) NULL,
	plm_id uuid NULL,
	design_system_id uuid NULL,
	sales_u int4 NULL,
	receipt_u int4 NULL,
	regweeks int4 NULL,
	bop int4 NULL,
	sales_dollars numeric NULL,
	aur numeric NULL,
	st_percent numeric NULL,
	aps numeric NULL,
	gm_percent numeric NULL,
	gm_dollars numeric NULL,
	a0_name text NULL,
	a1_name text NULL,
	a2_name text NULL,
	auc int4 NULL,
	air int4 NULL,
	product_status varchar(20) NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	buy_unit int4 NULL,
	buy_dollar numeric NULL,
	launch_date date NULL,
	exit_date date NULL,
	store_count int4 NULL,
	placeholder_id int4 NULL,
	CONSTRAINT line_plan_products_pkey PRIMARY KEY (line_plan_product_list_id),
	CONSTRAINT fk_line_plan FOREIGN KEY (line_plan_id) REFERENCES visual_line_planning.line_plan(line_plan_id) ON DELETE CASCADE,
	CONSTRAINT fk_product FOREIGN KEY (product_id) REFERENCES visual_line_planning.product_master_new(product_code) ON DELETE SET NULL
);

--changeset shannonnelson.d@impactanalytics.co:buyer_emails_added stripComments:false splitStatements:false context:Release_2_0 labels:buyer_emails_added
--comment: adding buyer_emails column
ALTER TABLE visual_line_planning.line_plan_products
ADD COLUMN buyer_emails text[] DEFAULT '{}'::text[];

--changeset mayank.mukundam@impactanalytics.co:add_image_url stripComments:false splitStatements:false context:Release_2_1 labels:add_image_url
--comment: adding image_url column
ALTER TABLE visual_line_planning.line_plan_products
ADD COLUMN image_url text NULL;