--liquibase formatted sql
--changeset liquibase:due_in_alert stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for due_in_alert
CREATE TABLE inventory_smart.due_in_alert (
	l7_code varchar(50) NULL,
	article varchar NULL,
	color varchar NULL,
	l3_name varchar NULL,
	l4_name varchar NULL,
	l5_name varchar NULL,
	l6_name varchar(50) NULL,
	fiscal_year int4 NULL,
	fiscal_week int4 NULL,
	available_due_in_to_allocate float4 NULL,
	"action" varchar NULL,
	dc_mapped varchar NULL,
	due_in_alert_is_resolved int4 NULL,
	due_in_alert_flag int4 NULL,
	l0_name varchar NULL,
	l2_name varchar NULL,
	article_description varchar NULL
);

--changeset himansh.bhardwaj@impactanalytics.co:create_display_column stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: create new column in alerts table
ALTER TABLE inventory_smart.due_in_alert ADD COLUMN IF NOT EXISTS display_article varchar NULL;

--changeset himansh.bhardwaj@impactanalytics.co:create_product_group stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: adding product_group column
ALTER TABLE inventory_smart.due_in_alert ADD COLUMN IF NOT EXISTS product_group TEXT[];

--changeset himansh.bhardwaj@impactanalytics.co:alter_product_group_type stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: changing data type of product_group from TEXT[] to VARCHAR[]
ALTER TABLE inventory_smart.due_in_alert 
ALTER COLUMN product_group 
TYPE VARCHAR[] 
USING product_group::VARCHAR[];

--changeset sri.harsha@impactanalytics.co:create_display_column stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: create new column in alerts table
ALTER TABLE inventory_smart.due_in_alert ADD COLUMN IF NOT EXISTS l1_name varchar NULL;

--changeset sri.harsha@impactanalytics.co:create_po_code stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: create new column in alerts table
ALTER TABLE inventory_smart.due_in_alert ADD COLUMN IF NOT EXISTS po_code varchar NULL;


--changeset himansh.bhardwaj@impactanalytics.co:adding pk stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: adding pk
ALTER TABLE inventory_smart.due_in_alert ADD CONSTRAINT due_in_alert_primary_key PRIMARY KEY (po_code);

--changeset himansh.bhardwaj@impactanalytics.co:dc_assignment stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: dc_assignment
ALTER TABLE inventory_smart.due_in_alert ADD COLUMN IF NOT EXISTS dc_assignment varchar NULL;

--changeset prince.kumar@impactanalytics.co:adding_on_floor_date_1 and markdown_date_1 stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: adding_on_floor_date and markdown_date
ALTER TABLE inventory_smart.due_in_alert 
ADD COLUMN IF NOT EXISTS on_floor_date date NULL,
ADD COLUMN IF NOT EXISTS markdown_date date NULL;