--liquibase formatted sql
--changeset arshad.k@impactanalytics.co:tb_sub_master_config stripComments:false splitStatements:false context:Release_1_0 labels:MTP-49552
--comment: initial changeset for tb_sub_master_config

CREATE TABLE meta_schema.tb_sub_master_config (
	id serial4 NOT NULL,
	attribute_id int4 NOT NULL,
	"name" varchar(50) NOT NULL,
	description varchar(50) NULL,
	product_l0_editable bool DEFAULT false NULL,
	product_l1_editable bool DEFAULT false NULL,
	product_l2_editable bool DEFAULT false NULL,
	channel_l0_editable bool DEFAULT false NULL,
	channel_l1_editable bool DEFAULT false NULL,
	CONSTRAINT attribute_unique UNIQUE (attribute_id),
	CONSTRAINT sub_master_attributes_config_pk PRIMARY KEY (id)
);


-- meta_schema.tb_sub_master_config foreign keys

ALTER TABLE meta_schema.tb_sub_master_config ADD CONSTRAINT tb_sub_master_config_attribute_id_fkey FOREIGN KEY (attribute_id) REFERENCES meta_schema.tb_sub_master_attributes(id);