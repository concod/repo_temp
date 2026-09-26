--liquibase formatted sql
--changeset liquibase:tb_acceptable_price_points stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_acceptable_price_points

CREATE TABLE price_promo.tb_acceptable_price_points (
	l0_cid int4 NULL,
	l0_name varchar(50) NULL,
	price int4 NULL
);

--changeset harshith.mandli@impactanalytics.co:tb_acceptable_price_points stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:tb_acceptable_price_points
--comment: Altering columns in price_promo.tb_acceptable_price_points

ALTER TABLE price_promo.tb_acceptable_price_points 
ADD COLUMN IF NOT EXISTS s0_id int4 NULL,
ADD COLUMN IF NOT EXISTS s0_name varchar(50) NULL;

ALTER TABLE price_promo.tb_acceptable_price_points 
DROP COLUMN IF EXISTS l0_cid CASCADE,
DROP COLUMN IF EXISTS l0_name CASCADE;