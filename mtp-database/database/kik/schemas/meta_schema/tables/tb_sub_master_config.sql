--liquibase formatted sql
--changeset abhishek.kohli@impactanalytics.co:tb_sub_master_config stripComments:false splitStatements:false context:Release_1_0 labels:MTP-40534
--comment: initial changeset for tb_sub_master_config
create table meta_schema.tb_sub_master_config
( 
	id serial4 NOT null,
	attribute_id int4 not null constraint attribute_unique unique references meta_schema.tb_sub_master_attributes(id),
	name varchar(50) not null,
	description varchar(50),
	product_l0_editable bool DEFAULT false,
	product_l1_editable bool DEFAULT false,
	product_l2_editable bool DEFAULT false,
	channel_l0_editable bool DEFAULT false,
	channel_l1_editable bool DEFAULT false,
	CONSTRAINT sub_master_attributes_config_pk PRIMARY KEY (id)
);
