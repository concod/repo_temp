--liquibase formatted sql
--changeset liquibase:tb_acceptable_price_points stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_acceptable_price_points

CREATE TABLE price_promo.tb_acceptable_price_points (
	l0_cid int4 NULL,
	l0_name varchar(50) NULL,
	price int4 NULL
);