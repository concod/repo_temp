-- liquibase formatted sql
-- changeset aiyush.prasad@impactanalytics.co:store_attributes_filter stripComments:false splitStatements:false context: db_sync labels:liquibase_project_start
-- comment: initial changeset for store_attributes_filter
CREATE TABLE  "global".store_attributes_filter (
	s0_name varchar NOT NULL,
	s1_name varchar NOT NULL,
	s2_name varchar NOT NULL,
	s3_name varchar NOT NULL,
	store_code varchar NOT NULL,
	s4_name varchar NOT NULL,
	active bool NOT NULL,
	dc_flag bool NOT NULL,
	dc_code int4 NULL,
	created_at timestamptz NOT NULL,
	updated_at timestamptz NOT NULL,
	created_by varchar NOT NULL,
	updated_by varchar NOT NULL,
	is_deleted bool NOT NULL,
	available_to_allocate bool NOT NULL,
	apparel_locations varchar NOT NULL,
	asian_tourist_location varchar NOT NULL,
	climate varchar NOT NULL,
	concession_location varchar NOT NULL,
	cust_type varchar NOT NULL,
	fs_visibility_location varchar NOT NULL,
	ftwear_boot_tier_locations varchar NOT NULL,
	ftwear_capacity_location varchar NOT NULL,
	ftwear_hot_weather_location varchar NOT NULL,
	ftwear_key_itm_location varchar NOT NULL,
	ftwear_location varchar NOT NULL,
	ftwear_sneaker_tier_location varchar NOT NULL,
	jewelry_location varchar NOT NULL,
	location_indicator2 varchar NOT NULL,
	locationindicator_orig varchar NOT NULL,
	ly_assort_focus_location varchar NOT NULL,
	men_concept_location varchar NOT NULL,
	mens_ftwear_location varchar NOT NULL,
	mens_location varchar NOT NULL,
	msfrp_locations varchar NOT NULL,
	open_date date NOT NULL,
	pilot_location varchar NOT NULL,
	primary_dc varchar NOT NULL,
	region varchar NOT NULL,
	resort_location varchar NOT NULL,
	sap_site_id varchar NOT NULL,
	secondary_dc varchar NOT NULL,
	signature_c_focus_location varchar NOT NULL,
	"size" varchar NOT NULL,
	store_grade varchar NOT NULL,
	store_id varchar NOT NULL,
	store_type varchar NOT NULL,
	sunglass_location varchar NOT NULL,
	variable_prc_location varchar NOT NULL,
	visual_merchandising_location varchar NOT NULL,
	watch_location varchar NOT NULL,
	wearables_location varchar NOT NULL,
	zipcode varchar NOT NULL,
	special_classification varchar NULL,
	store_classification varchar NULL,
	store_description varchar NULL,
	store_name varchar NULL,
	CONSTRAINT store_attributes_filter_pk PRIMARY KEY (store_code),
	CONSTRAINT store_attributes_filter_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
);

--changeset draksharapu.rajesh@impactanalytics.co:store_attributes_filter_new_columns stripComments:false splitStatements:false context:Release_1_0 labels:column addition
--comment: store_attributes_filter column addition

-- Add missing columns from local DDL to UAT branch table
ALTER TABLE "global".store_attributes_filter 
  ADD COLUMN   userstatus int4,
  ADD COLUMN   store_grade_dept_1 varchar,
  ADD COLUMN   store_grade_dept_2 varchar,
  ADD COLUMN   store_grade_dept_n varchar,
  ADD COLUMN   latitude numeric,
  ADD COLUMN   longitude numeric,
  ADD COLUMN   sisterstorecode varchar,
  ADD COLUMN   category_type varchar,
  ADD COLUMN   pos_id varchar,
  ADD COLUMN   locationindicator2 varchar,
  ADD COLUMN   store_size varchar,
  ADD COLUMN   active_orig bool,
  ADD COLUMN   fc_code int4,
  ADD COLUMN   s0_id varchar,
  ADD COLUMN   s1_id varchar,
  ADD COLUMN   s2_id varchar,
  ADD COLUMN   channel_group varchar,
  ADD COLUMN   close_date date,
  ADD COLUMN   district varchar,
  ADD COLUMN   dc_name varchar,
  ADD COLUMN   s3_id varchar;


--changeset aiyush.prasad@impactanalytics.co:store_attributes_filter_new_column stripComments:false splitStatements:false context:Release_1_0 labels:column addition
--comment: store_attributes_filter column addition
ALTER TABLE global.store_attributes_filter ADD COLUMN channel varchar;


--changeset aiyush.prasad@impactanalytics.co:store_attributes_filter_poppy_location_column_addition stripComments:false splitStatements:false context:Release_1_0 labels:column addition poppy location
--comment: store_attributes_filter poppy location column addition
ALTER TABLE global.store_attributes_filter ADD column   poppy_location varchar;



--changeset draksharapu.rajesh@impactanalytics.co:store_attributes_filter_changing_datatypes_of_createdby_updatedby_columns stripComments:false splitStatements:false context:Release_1_0 labels:column datatype change
--comment: store_attributes_filter_changing_datatypes_of_createdby_updatedby_columns datatype change

ALTER TABLE "global".store_attributes_filter ALTER COLUMN created_by TYPE int4 USING created_by::int4;
ALTER TABLE "global".store_attributes_filter ALTER COLUMN updated_by TYPE int4 USING updated_by::int4;



--changeset draksharapu.rajesh@impactanalytics.co:store_attributes_filter_drop_not_null_constraints stripComments:false splitStatements:false context:Release_1_0 labels:constraint modification
--comment: Dropping NOT NULL constraints to match GSM

ALTER TABLE "global".store_attributes_filter ALTER COLUMN available_to_allocate DROP NOT NULL;
ALTER TABLE "global".store_attributes_filter ALTER COLUMN apparel_locations DROP NOT NULL;
ALTER TABLE "global".store_attributes_filter ALTER COLUMN asian_tourist_location DROP NOT NULL;
ALTER TABLE "global".store_attributes_filter ALTER COLUMN climate DROP NOT NULL;
ALTER TABLE "global".store_attributes_filter ALTER COLUMN concession_location DROP NOT NULL;
ALTER TABLE "global".store_attributes_filter ALTER COLUMN cust_type DROP NOT NULL;
ALTER TABLE "global".store_attributes_filter ALTER COLUMN fs_visibility_location DROP NOT NULL;
ALTER TABLE "global".store_attributes_filter ALTER COLUMN ftwear_boot_tier_locations DROP NOT NULL;
ALTER TABLE "global".store_attributes_filter ALTER COLUMN ftwear_capacity_location DROP NOT NULL;
ALTER TABLE "global".store_attributes_filter ALTER COLUMN ftwear_hot_weather_location DROP NOT NULL;
ALTER TABLE "global".store_attributes_filter ALTER COLUMN ftwear_key_itm_location DROP NOT NULL;
ALTER TABLE "global".store_attributes_filter ALTER COLUMN ftwear_location DROP NOT NULL;
ALTER TABLE "global".store_attributes_filter ALTER COLUMN ftwear_sneaker_tier_location DROP NOT NULL;
ALTER TABLE "global".store_attributes_filter ALTER COLUMN jewelry_location DROP NOT NULL;
ALTER TABLE "global".store_attributes_filter ALTER COLUMN location_indicator2 DROP NOT NULL;
ALTER TABLE "global".store_attributes_filter ALTER COLUMN locationindicator_orig DROP NOT NULL;
ALTER TABLE "global".store_attributes_filter ALTER COLUMN ly_assort_focus_location DROP NOT NULL;
ALTER TABLE "global".store_attributes_filter ALTER COLUMN men_concept_location DROP NOT NULL;
ALTER TABLE "global".store_attributes_filter ALTER COLUMN mens_ftwear_location DROP NOT NULL;
ALTER TABLE "global".store_attributes_filter ALTER COLUMN mens_location DROP NOT NULL;
ALTER TABLE "global".store_attributes_filter ALTER COLUMN msfrp_locations DROP NOT NULL;
ALTER TABLE "global".store_attributes_filter ALTER COLUMN open_date DROP NOT NULL;
ALTER TABLE "global".store_attributes_filter ALTER COLUMN pilot_location DROP NOT NULL;
ALTER TABLE "global".store_attributes_filter ALTER COLUMN primary_dc DROP NOT NULL;
ALTER TABLE "global".store_attributes_filter ALTER COLUMN resort_location DROP NOT NULL;
ALTER TABLE "global".store_attributes_filter ALTER COLUMN secondary_dc DROP NOT NULL;
ALTER TABLE "global".store_attributes_filter ALTER COLUMN signature_c_focus_location DROP NOT NULL;
ALTER TABLE "global".store_attributes_filter ALTER COLUMN store_grade DROP NOT NULL;
ALTER TABLE "global".store_attributes_filter ALTER COLUMN sunglass_location DROP NOT NULL;
ALTER TABLE "global".store_attributes_filter ALTER COLUMN variable_prc_location DROP NOT NULL;
ALTER TABLE "global".store_attributes_filter ALTER COLUMN visual_merchandising_location DROP NOT NULL;
ALTER TABLE "global".store_attributes_filter ALTER COLUMN watch_location DROP NOT NULL;
ALTER TABLE "global".store_attributes_filter ALTER COLUMN wearables_location DROP NOT NULL;
ALTER TABLE "global".store_attributes_filter ALTER COLUMN zipcode DROP NOT NULL;
ALTER TABLE "global".store_attributes_filter ALTER COLUMN region DROP NOT NULL;
ALTER TABLE "global".store_attributes_filter ALTER COLUMN "size" DROP NOT NULL;
ALTER TABLE "global".store_attributes_filter ALTER COLUMN store_id DROP NOT NULL;
ALTER TABLE "global".store_attributes_filter ALTER COLUMN store_type DROP NOT NULL;

--changeset draksharapu.rajesh@impactanalytics.co:store_attributes_filter_set_category_type_not_null stripComments:false splitStatements:false context:Release_1_0 labels:constraint modification
--comment: Setting category_type to NOT NULL as required by business logic
ALTER TABLE "global".store_attributes_filter ALTER COLUMN category_type SET NOT NULL;

--changeset manas.malik@impactanalytics.co:updated_created stripComments:false splitStatements:false context:Release_1_0 labels:constraint modification
--comment: updated_created_remove null
ALTER TABLE "global".store_attributes_filter ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE "global".store_attributes_filter ALTER COLUMN updated_by DROP NOT NULL;



--changeset hemantkumar.bajaj@impactanalytics.co:ike_store_id stripComments:false splitStatements:false context:Release_1_0 labels:
--comment: add column like_store_id
ALTER TABLE "global".store_attributes_filter ADD COLUMN like_store_id varchar NULL;



--changeset hemantkumar.bajaj@impactanalytics.co:channel_orig stripComments:false splitStatements:false context:Release_1_0 labels:
--comment: add column channel_orig
ALTER TABLE "global".store_attributes_filter ADD COLUMN channel_orig varchar NULL;