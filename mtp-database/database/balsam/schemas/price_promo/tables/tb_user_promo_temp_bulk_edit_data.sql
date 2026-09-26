--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:tb_user_promo_temp_bulk_edit_data stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Initial changeset for price_promo.tb_user_promo_temp_bulk_edit_data

CREATE TABLE price_promo.tb_user_promo_temp_bulk_edit_data (
	promo_id int4 NOT NULL,
	user_id int4 NOT NULL,
	product_level_id int8 NULL,
	store_level_id int NULL,
	customer_level_id int8 NULL,
	scenario_data jsonb NOT NULL,
	ia_recommended_data jsonb NULL,
	id int4 NOT NULL
)	
partition by list(promo_id);