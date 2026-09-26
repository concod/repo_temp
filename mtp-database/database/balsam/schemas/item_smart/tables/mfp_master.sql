--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:mfp_master stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial_changeset_for_mfp_master
CREATE TABLE item_smart.mfp_master (
	l0_name text NOT NULL,
	dept text NOT NULL,
	fiscal_year_week date NOT NULL,
	margin_plan numeric(18, 2) NULL,
	receipts_plan numeric(18, 2) NULL,
	inventory_plan numeric(18, 2) NULL,
	unit_sales_plan numeric(18, 2) NULL,
	margin_forecast numeric(18, 2) NULL,
	receipts_forecast numeric(18, 2) NULL,
	inventory_forecast numeric(18, 2) NULL,
	margin_base_plan numeric(18, 2) NULL,
	inventory_base_plan numeric(18, 2) NULL,
	unit_sales_forecast numeric(18, 2) NULL,
	product_revenue_plan numeric(18, 2) NULL,
	unit_sales_base_plan numeric(18, 2) NULL,
	product_revenue_forecast numeric(18, 2) NULL,
	product_revenue_base_plan numeric(18, 2) NULL,
	CONSTRAINT mfp_master_pkey PRIMARY KEY (l0_name, dept, fiscal_year_week)
);
CREATE INDEX idx_mfp_dept_week ON item_smart.mfp_master(dept, fiscal_year_week);


--changeset abhimanyu.j@impactanalytics.co:data_type_change stripComments:false splitStatements:false context:Release_1_0 labels:data_type_change
--comment: alter data_type_change
ALTER TABLE item_smart.mfp_master
ALTER COLUMN fiscal_year_week TYPE INT
USING NULL;

--changeset hari.krishna@impactanalytics.co:data_type_change stripComments:false splitStatements:false context:Release_1_0 labels:data_type_change
--comment: alter dept column
ALTER TABLE item_smart.mfp_master RENAME COLUMN dept TO l1_name;