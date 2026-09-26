--liquibase formatted sql
--changeset liquibase:article_inventory_dashboard stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for article_inventory_dashboard
CREATE TABLE inventory_smart.article_inventory_dashboard (
	article varchar NOT NULL,
	store_code varchar NOT NULL,
	store_name varchar NULL,
	floorset_date date NULL,
	markdown_date date NULL,
	l7_code varchar NULL,
	article_description varchar NULL,
	color varchar NULL,
	size_count varchar NULL,
	l2_name varchar NULL,
	l4_name varchar NULL,
	l5_name varchar NULL,
	l6_name varchar NULL,
	global_fit_platform varchar NULL,
	distributions varchar NULL,
	lw_units int4 NULL,
	lw_revenue float4 NULL,
	lw_margin_perc float4 NULL,
	price float4 NULL,
	promo_percentage float4 NULL,
	vir_pdu_remaining int4 NULL,
	last_8_week_sales float4 NULL,
	iob int4 NULL,
	oh float4 NULL,
	oh_it int4 NULL,
	oh_it_oo int4 NULL,
	stockout int4 NULL,
	shortfall int4 NULL,
	normal int4 NULL,
	excess int4 NULL,
	wos_oh float4 NULL,
	wos_oh_oo float4 NULL,
	wos_oh_it_oo float4 NULL,
	wos_target float4 NULL,
	row_num int4 NULL,
	oo float4 NULL,
	it float4 NULL,
	wos_oh_it float4 NULL,
	vir_reservation_total float4 NULL,
	delivered_mtd int4 NULL,
	perc_committed float4 NULL,
	sell_through_perc float4 NULL,
	instock_percentage float4 NULL,
	dc_oh float4 NULL,
	CONSTRAINT article_inventory_dashboard_pk PRIMARY KEY (article, store_code),
	CONSTRAINT article_inventory_dashboard_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
);
CREATE INDEX article_inventory_dashboard_article_idx ON inventory_smart.article_inventory_dashboard USING btree (article);
CREATE INDEX article_inventory_dashboard_store_code_idx ON inventory_smart.article_inventory_dashboard USING btree (store_code);

--changeset liquibase:AID stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_on_going
--comment: dropping a column in AID
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN row_num CASCADE;

--changeset liquibase:article_inv_d stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_going
--comment: adding columns in AID
ALTER TABLE inventory_smart.article_inventory_dashboard add COLUMN discount float4;
ALTER TABLE inventory_smart.article_inventory_dashboard add COLUMN last_4_week_sales bigint;

--changeset sri.harharsha:article_inv_d_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_going
--comment: adding columns in AID
ALTER TABLE inventory_smart.article_inventory_dashboard 
ADD COLUMN IF NOT EXISTS msrp float4;

--changeset sri.harharsha:article_inv_d_3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_going
--comment: adding columns in AID_2
ALTER TABLE inventory_smart.article_inventory_dashboard 
ADD COLUMN IF NOT EXISTS l1_name varchar;

--changeset himansh.bhardwaj:changing DT to JSONB stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_going
--comment: changing columns datatypes to JSONB wherever required
ALTER TABLE inventory_smart.article_inventory_dashboard
ALTER COLUMN dc_oh TYPE jsonb USING to_jsonb(dc_oh),
ALTER COLUMN vir_reservation_total TYPE jsonb USING to_jsonb(vir_reservation_total),
ALTER COLUMN vir_pdu_remaining TYPE jsonb USING to_jsonb(vir_pdu_remaining),
ALTER COLUMN iob TYPE jsonb USING to_jsonb(iob),
ALTER COLUMN delivered_mtd TYPE jsonb USING to_jsonb(delivered_mtd),
ALTER COLUMN perc_committed TYPE jsonb USING to_jsonb(perc_committed);

--changeset himansh.bhardwaj:reverting some from JSONB to INT4,FLOAT4 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_going
--comment: reverting back deli_MTD and perc_committed as they are not coming at dc_split
ALTER TABLE inventory_smart.article_inventory_dashboard ALTER COLUMN delivered_mtd TYPE int4 USING delivered_mtd::int4;
ALTER TABLE inventory_smart.article_inventory_dashboard ALTER COLUMN perc_committed TYPE float4 USING perc_committed::float4;

--changeset himansh.bhardwaj:adding some missing columns stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_going
--comment: adding some missing columns
ALTER TABLE inventory_smart.article_inventory_dashboard 
ADD COLUMN IF NOT EXISTS lw_margin FLOAT4 NULL,
ADD COLUMN IF NOT EXISTS l0_name VARCHAR NULL,
ADD COLUMN IF NOT EXISTS l3_name VARCHAR NULL;

--changeset himansh.bhardwaj:adding_v2_changes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_going
--comment: adding_v2_changes
ALTER TABLE inventory_smart.article_inventory_dashboard
    ADD COLUMN IF NOT EXISTS w2_units int4 NULL,
    ADD COLUMN IF NOT EXISTS w3_units int4 NULL,
    ADD COLUMN IF NOT EXISTS w4_units int4 NULL,
    ADD COLUMN IF NOT EXISTS w5_units int4 NULL,
    ADD COLUMN IF NOT EXISTS w6_units int4 NULL,
    ADD COLUMN IF NOT EXISTS w7_units int4 NULL,
    ADD COLUMN IF NOT EXISTS w8_units int4 NULL,
    ADD COLUMN IF NOT EXISTS wtd_units int4 null,
    ADD COLUMN IF NOT EXISTS dc_it jsonb NULL,
    ADD COLUMN IF NOT EXISTS dc_oo jsonb null,
	ADD COLUMN IF NOT EXISTS in_stock_count int4 NULL,
	ADD COLUMN IF NOT EXISTS total_count int4 null;

--changeset himansh.bhardwaj:adding_aa_dc stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_going
--comment: adding_aa_dc
ALTER TABLE inventory_smart.article_inventory_dashboard
ADD COLUMN IF NOT EXISTS auto_allocation_dc VARCHAR NULL;

--changeset himansh.bhardwaj:adding_pt_sg stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_going
--comment: adding_pt_sg
ALTER TABLE inventory_smart.article_inventory_dashboard
ADD COLUMN IF NOT EXISTS product_tag VARCHAR NULL,
ADD COLUMN IF NOT EXISTS store_grade VARCHAR NULL;

--changeset himansh.bhardwaj:adding_all_store_filter_columns stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_going
--comment: adding_all_store_filter_columns
ALTER TABLE inventory_smart.article_inventory_dashboard
ADD COLUMN IF NOT EXISTS channel VARCHAR NULL,
ADD COLUMN IF NOT EXISTS country_id VARCHAR NULL,
ADD COLUMN IF NOT EXISTS state VARCHAR NULL,
ADD COLUMN IF NOT EXISTS store_group TEXT[] NULL,
ADD COLUMN IF NOT EXISTS territory VARCHAR NULL,
ADD COLUMN IF NOT EXISTS district VARCHAR NULL;

--changeset himansh.bhardwaj:adding_aaf stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_going
--comment: adding_aaf
ALTER TABLE inventory_smart.article_inventory_dashboard
ADD COLUMN IF NOT EXISTS article_alert_flag VARCHAR NULL;

--changeset himansh.bhardwaj:extra_cols_for_lse stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_going
--comment: extra_cols_for_lse
ALTER TABLE inventory_smart.article_inventory_dashboard
ADD COLUMN IF NOT EXISTS mfp_categorization VARCHAR NULL,
ADD COLUMN IF NOT EXISTS lifecycle VARCHAR NULL,
ADD COLUMN IF NOT EXISTS store_cluster VARCHAR NULL,
ADD COLUMN IF NOT EXISTS last_4_week_revenue FLOAT4 NULL,
ADD COLUMN IF NOT EXISTS last_4_week_margin FLOAT4 NULL;