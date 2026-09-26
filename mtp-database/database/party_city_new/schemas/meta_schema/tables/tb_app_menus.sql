--liquibase formatted sql
--changeset arshad.k@impactanalytics.co:tb_app_menus stripComments:false splitStatements:false context:Release_1_0 labels:MTP-49552
--comment: initial changeset for tb_app_menus

CREATE TABLE meta_schema.tb_app_menus (
	id serial4 NOT NULL,
	"name" varchar(30) NOT NULL,
	is_active bool DEFAULT true NULL,
	parent_menu_id int4 NULL,
	application_id int4 NULL,
	display_name varchar(30) NULL,
	route varchar(300) NULL,
	open_targate_in int4 NULL,
	remarks varchar(200) NULL,
	is_deleted bool DEFAULT false NULL,
	CONSTRAINT tb_app_menus_id_key UNIQUE (id),
	CONSTRAINT tb_app_menus_pkey PRIMARY KEY (name)
);


-- meta_schema.tb_app_menus foreign keys

ALTER TABLE meta_schema.tb_app_menus ADD CONSTRAINT fk_application_id FOREIGN KEY (application_id) REFERENCES meta_schema.tb_applications(id);