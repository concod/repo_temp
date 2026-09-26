--liquibase formatted sql
--changeset liquibase:article_inventory_dashboard stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for article_inventory_dashboard
CREATE TABLE   inventory_smart.article_inventory_dashboard (
	l0_name varchar NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	l3_name varchar NULL,
	l4_name varchar NULL,
	l5_name varchar NULL,
	l6_name varchar NULL,
	l7_name varchar NULL,
	l8_name varchar NULL,
	article varchar NULL,
	assortment_indicator varchar NULL,
	factory_type varchar NULL,
	intro_date date NULL,
	store_code varchar NULL,
	sell_through_perc float4 NULL,
	lw_sales_units int4 NULL,
	wtd_sales_units int4 NULL,
	dc_oh int4 NULL,
	store_oh_it_oo int4 NULL,
	in_stock_perc float4 NULL,
	wos_oh_oo_it float4 NULL,
	last_8_week_sales int4 NULL,
	lw_margin_perc int4 NULL,
	lw_revenue int4 NULL,
	wos_oh float8 NULL,
	wos_oh_it float8 NULL,
	wos_oh_oo float8 NULL,
	store_oh float8 NULL,
	store_oo float8 NULL,
	store_it float8 NULL,
	store_oh_it float8 NULL,
	stockout float8 NULL,
	shortfall float8 NULL,
	excess float8 NULL,
	normal float8 NULL,
	lw_promo float8 NULL,
	lw_aur float8 NULL,
	wtd_revenue float4 NULL,
	wtd_margin float4 NULL,
	wtd_promo float4 NULL,
	wtd_aur float4 NULL,
	last_allocated_date varchar NULL,
	store_groups _int4 DEFAULT ARRAY[]::integer[] NULL,
	dc_oh_it_oo_can int4 NULL,
	dc_it int4 NULL,
	dc_oo int4 NULL,
	lw_aur_can float4 NULL,
	lw_margin_perc_can float4 NULL,
	lw_promo_can float4 NULL,
	lw_revenue_can float4 NULL,
	lw_sales_units_can float4 NULL,
	wtd_aur_can float4 NULL,
	wtd_margin_can float4 NULL,
	wtd_promo_can float4 NULL,
	wtd_revenue_can float4 NULL,
	wtd_sales_units_can float4 NULL,
	dc_it_can float4 NULL,
	dc_oh_can float4 NULL,
	dc_oh_it_oo float4 NULL,
	dc_oo_can float4 NULL,
	dc_it_us float4 NULL,
	dc_oh_us float4 NULL,
	dc_oh_it_oo_us float4 NULL,
	dc_oo_us float4 NULL,
	lw_aur_us float4 NULL,
	lw_margin_perc_us float4 NULL,
	lw_promo_us float4 NULL,
	lw_revenue_us float4 NULL,
	lw_sales_units_us float4 NULL,
	wtd_aur_us float4 NULL,
	wtd_margin_us float4 NULL,
	wtd_promo_us float4 NULL,
	wtd_revenue_us float4 NULL,
	wtd_sales_units_us float4 NULL,
	wos_targeted float4 NULL,
	article_status_tag varchar NULL,
	forecast_1week float4 NULL,
	forecast_4weeks float4 NULL,
	l4_weeks_units float4 NULL,
	forecast_8weeks float4 NULL,
	l8_weeks_units float4 NULL,
	stockout_flag int4 NULL,
	shortfall_flag int4 NULL,
	stockout_is_resolved int4 NULL,
	shortfall_is_resolved int4 NULL,
	style_desc varchar NULL,
	color_code varchar NULL,
	style_id varchar NULL,
	size_integrity float4 NULL
);

--changeset aiyush.prasad@impactanalytics.co:article_inventory_dashboard_change_v1 stripComments:false splitStatements:false context: store_name column addition labels:add store_name  
--comment: add store_name
ALTER TABLE inventory_smart.article_inventory_dashboard ADD store_name varchar NULL;

--changeset aiyush.prasad@impactanalytics.co:article_inventory_dashboard_change_v3 stripComments:false splitStatements:false context: channel column addition labels:add channel 
--comment: add channel
ALTER TABLE inventory_smart.article_inventory_dashboard ADD channel varchar NULL;

-- changeset manas.malik@impactanalytics.co:article_inventory_dashboard_change_v4 stripComments:false splitStatements:false context: channel column addition labels:add channel 
-- comment: add storegroup varchar
ALTER TABLE inventory_smart.article_inventory_dashboard
DROP COLUMN store_groups;

ALTER TABLE inventory_smart.article_inventory_dashboard
ADD COLUMN store_group varchar;


-- changeset hemantkumar.bajaj@impactanalytics.co:article_inventory_dashboard_change_v5 stripComments:false splitStatements:false context: channel column addition labels:
-- comment: add color_name varchar

ALTER TABLE inventory_smart.article_inventory_dashboard
ADD COLUMN color_name varchar;


-- changeset hemantkumar.bajaj@impactanalytics.co:article_inventory_dashboard_change_v6 stripComments:false splitStatements:false context: channel column addition labels:
-- comment: add product_reach varchar

ALTER TABLE inventory_smart.article_inventory_dashboard
ADD COLUMN product_reach varchar;


-- changeset hemantkumar.bajaj@impactanalytics.co:article_inventory_dashboard_change_v7 stripComments:false splitStatements:false context: channel column addition labels:
-- comment: add product_reach_desc varchar

ALTER TABLE inventory_smart.article_inventory_dashboard
ADD COLUMN product_reach_desc varchar;



-- changeset rajesh.draksharapu@impactanalytics.co:article_inventory_dashboard_change_v8 stripComments:false splitStatements:false context: channel column addition labels:
-- comment: add product_reach_desc varchar

ALTER TABLE inventory_smart.article_inventory_dashboard
ADD COLUMN pack_id varchar;

-- changeset hemantkumar.bajaj@impactanalytics.co:article_inventory_dashboard_change_v8 stripComments:false splitStatements:false context: channel column addition labels:
-- comment: add product_vertical varchar

ALTER TABLE inventory_smart.article_inventory_dashboard
ADD COLUMN product_vartical varchar;

ALTER TABLE inventory_smart.article_inventory_dashboard
ADD COLUMN product_vartical_desc varchar;


-- changeset hemantkumar.bajaj@impactanalytics.co:article_inventory_dashboard_change_v9 stripComments:false splitStatements:false context: channel column addition labels:
-- comment: add product_vertical varchar

ALTER TABLE inventory_smart.article_inventory_dashboard
RENAME COLUMN product_vartical TO product_vertical;

ALTER TABLE inventory_smart.article_inventory_dashboard
RENAME COLUMN product_vartical_desc TO product_vertical_desc;

-- changeset hemantkumar.bajaj@impactanalytics.co:article_inventory_dashboard_change_v10 stripComments:false splitStatements:false context: channel column addition labels:
-- comment: add dc_store_split


ALTER TABLE inventory_smart.article_inventory_dashboard
    ADD COLUMN dc_canada_oh float4 DEFAULT 0,
    ADD COLUMN dc_canada_it float4 DEFAULT 0,
    ADD COLUMN dc_canada_oo float4 DEFAULT 0,
    ADD COLUMN dc_canada_oh_it_oo float4 DEFAULT 0,

    ADD COLUMN dc_canada_ccls_oh float4 DEFAULT 0,
    ADD COLUMN dc_canada_ccls_it float4 DEFAULT 0,
    ADD COLUMN dc_canada_ccls_oo float4 DEFAULT 0,
    ADD COLUMN dc_canada_ccls_oh_it_oo float4 DEFAULT 0,

    ADD COLUMN dc_ohio_oh float4 DEFAULT 0,
    ADD COLUMN dc_ohio_it float4 DEFAULT 0,
    ADD COLUMN dc_ohio_oo float4 DEFAULT 0,
    ADD COLUMN dc_ohio_oh_it_oo float4 DEFAULT 0,

    ADD COLUMN dc_reynosa_oh float4 DEFAULT 0,
    ADD COLUMN dc_reynosa_it float4 DEFAULT 0,
    ADD COLUMN dc_reynosa_oo float4 DEFAULT 0,
    ADD COLUMN dc_reynosa_oh_it_oo float4 DEFAULT 0,

    ADD COLUMN dc_las_vegas_oh float4 DEFAULT 0,
    ADD COLUMN dc_las_vegas_it float4 DEFAULT 0,
    ADD COLUMN dc_las_vegas_oo float4 DEFAULT 0,
    ADD COLUMN dc_las_vegas_oh_it_oo float4 DEFAULT 0,

    ADD COLUMN dc_jax_oh float4 DEFAULT 0,
    ADD COLUMN dc_jax_it float4 DEFAULT 0,
    ADD COLUMN dc_jax_oo float4 DEFAULT 0,
    ADD COLUMN dc_jax_oh_it_oo float4 DEFAULT 0;


-- changeset hemantkumar.bajaj@impactanalytics.co:article_inventory_dashboard_change_v11 stripComments:false splitStatements:false context: channel column addition labels:
-- comment: add dc_store_split_change datatype


	ALTER TABLE inventory_smart.article_inventory_dashboard
    ALTER COLUMN dc_canada_oh TYPE integer USING dc_canada_oh::integer,
    ALTER COLUMN dc_canada_it TYPE integer USING dc_canada_it::integer,
    ALTER COLUMN dc_canada_oo TYPE integer USING dc_canada_oo::integer,
    ALTER COLUMN dc_canada_oh_it_oo TYPE integer USING dc_canada_oh_it_oo::integer,

    ALTER COLUMN dc_canada_ccls_oh TYPE integer USING dc_canada_ccls_oh::integer,
    ALTER COLUMN dc_canada_ccls_it TYPE integer USING dc_canada_ccls_it::integer,
    ALTER COLUMN dc_canada_ccls_oo TYPE integer USING dc_canada_ccls_oo::integer,
    ALTER COLUMN dc_canada_ccls_oh_it_oo TYPE integer USING dc_canada_ccls_oh_it_oo::integer,

    ALTER COLUMN dc_ohio_oh TYPE integer USING dc_ohio_oh::integer,
    ALTER COLUMN dc_ohio_it TYPE integer USING dc_ohio_it::integer,
    ALTER COLUMN dc_ohio_oo TYPE integer USING dc_ohio_oo::integer,
    ALTER COLUMN dc_ohio_oh_it_oo TYPE integer USING dc_ohio_oh_it_oo::integer,

    ALTER COLUMN dc_reynosa_oh TYPE integer USING dc_reynosa_oh::integer,
    ALTER COLUMN dc_reynosa_it TYPE integer USING dc_reynosa_it::integer,
    ALTER COLUMN dc_reynosa_oo TYPE integer USING dc_reynosa_oo::integer,
    ALTER COLUMN dc_reynosa_oh_it_oo TYPE integer USING dc_reynosa_oh_it_oo::integer,

    ALTER COLUMN dc_las_vegas_oh TYPE integer USING dc_las_vegas_oh::integer,
    ALTER COLUMN dc_las_vegas_it TYPE integer USING dc_las_vegas_it::integer,
    ALTER COLUMN dc_las_vegas_oo TYPE integer USING dc_las_vegas_oo::integer,
    ALTER COLUMN dc_las_vegas_oh_it_oo TYPE integer USING dc_las_vegas_oh_it_oo::integer,

    ALTER COLUMN dc_jax_oh TYPE integer USING dc_jax_oh::integer,
    ALTER COLUMN dc_jax_it TYPE integer USING dc_jax_it::integer,
    ALTER COLUMN dc_jax_oo TYPE integer USING dc_jax_oo::integer,
    ALTER COLUMN dc_jax_oh_it_oo TYPE integer USING dc_jax_oh_it_oo::integer;



-- changeset hemantkumar.bajaj@impactanalytics.co:article_inventory_dashboard_change_v12 stripComments:false splitStatements:false context: channel column addition labels:
-- comment: add different sales column

	ALTER TABLE inventory_smart.article_inventory_dashboard  ADD COLUMN IF NOT EXISTS l2w_sales float4 NULL;
	ALTER TABLE inventory_smart.article_inventory_dashboard  ADD COLUMN IF NOT EXISTS l3w_sales float4 NULL;
	ALTER TABLE inventory_smart.article_inventory_dashboard  ADD COLUMN IF NOT EXISTS l5w_sales float4 NULL;
	ALTER TABLE inventory_smart.article_inventory_dashboard  ADD COLUMN IF NOT EXISTS l6w_sales float4 NULL;
	ALTER TABLE inventory_smart.article_inventory_dashboard  ADD COLUMN IF NOT EXISTS l7w_sales float4 NULL;

	

-- changeset hemantkumar.bajaj@impactanalytics.co:article_inventory_dashboard_change_v13 stripComments:false splitStatements:false context: channel column addition labels:
-- comment: add column product_tag


ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN product_tag varchar GENERATED ALWAYS AS (
CASE
    WHEN stockout IS NOT NULL AND stockout <> 0::double precision THEN 'stockout'::text
    WHEN shortfall IS NOT NULL AND shortfall <> 0::double precision THEN 'shortfall'::text
    WHEN excess IS NOT NULL AND excess <> 0::double precision THEN 'excess'::text
    WHEN normal IS NOT NULL AND normal <> 0::double precision THEN 'normal'::text
    ELSE NULL::text
END) STORED NULL;


-- changeset hemantkumar.bajaj@impactanalytics.co:article_inventory_dashboard_change_v14 stripComments:false splitStatements:false context: channel column addition labels:
-- comment: adding column avg_discount and price

	ALTER TABLE inventory_smart.article_inventory_dashboard  ADD COLUMN avg_discount float4 NULL;
	ALTER TABLE inventory_smart.article_inventory_dashboard  ADD COLUMN price float4 NULL;

--changeset surendra.babu@impactanalytics.co:article_inventory_dashboard_article_idx_v1 stripComments:false splitStatements:false context:Release_1_0 labels:aid_article_idx
--comment: create index on article

CREATE INDEX IF NOT EXISTS article_inventory_dashboard_article_idx ON inventory_smart.article_inventory_dashboard USING btree (article);

-- changeset hemantkumar.bajaj@impactanalytics.co:article_inventory_dashboard_change_v15 stripComments:false splitStatements:false context: channel column addition labels:
-- comment: adding column store_grade,lms_attributes,lms_attribute_value

    ALTER TABLE inventory_smart.article_inventory_dashboard  ADD COLUMN store_grade varchar;
    ALTER TABLE inventory_smart.article_inventory_dashboard  ADD COLUMN lms_attributes varchar;
    
    ALTER TABLE inventory_smart.article_inventory_dashboard  ADD COLUMN lms_attribute_value varchar;

	
-- changeset hemantkumar.bajaj@impactanalytics.co:article_inventory_dashboard_change_v16 stripComments:false splitStatements:false context: channel column addition labels:
-- comment: add different sales column for l1,l4,l8 

	ALTER TABLE inventory_smart.article_inventory_dashboard  ADD COLUMN IF NOT EXISTS l1w_sales float4 NULL;
	ALTER TABLE inventory_smart.article_inventory_dashboard  ADD COLUMN IF NOT EXISTS l4w_sales float4 NULL;
	ALTER TABLE inventory_smart.article_inventory_dashboard  ADD COLUMN IF NOT EXISTS l8w_sales float4 NULL;