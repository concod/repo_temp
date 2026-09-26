--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:tb_sub_master_attributes stripComments:false splitStatements:false context:Release_1_0 labels:MTP-36859
--comment: initial changeset for tb_sub_master_attributes
CREATE TABLE meta_schema.tb_sub_master_attributes (
	id serial4 NOT NULL,
	"name" varchar(50) NOT NULL,
	"label" varchar(50) NULL,
	master_attribute_id int4 NOT NULL,
	parent_id numeric NOT NULL,
	remarks varchar(200) NULL,
	order_sequence int4 NULL,
	is_active bool NULL,
	created_at timestamp NULL,
	updated_at timestamp NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	calculation_req varchar(50) NULL,
	is_deleted bool NULL DEFAULT false,
	CONSTRAINT tb_sub_master_attributes_id_key UNIQUE (id),
	CONSTRAINT tb_sub_master_attributes_pkey PRIMARY KEY (name, master_attribute_id, parent_id),
	CONSTRAINT master_attribute_fk FOREIGN KEY (master_attribute_id) REFERENCES meta_schema.tb_master_attributes(id)
);