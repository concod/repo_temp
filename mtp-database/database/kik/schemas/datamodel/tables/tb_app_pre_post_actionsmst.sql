--liquibase formatted sql
--changeset archa.prakash@impactanalytics.co:tb_app_pre_post_actionsmst stripComments:false splitStatements:false context:Release_1_0 labels:tb_app_pre_post_actionsmst
--comment: initial changeset for tb_app_pre_post_actionsmst
CREATE TABLE datamodel.tb_app_pre_post_actionsmst (
	id serial4 NOT NULL,
	"type" int4 NOT NULL,
	is_active bool NULL DEFAULT false,
	identifier int4 NULL,
	pass_parameters bool NULL,
	output_parameter varchar(30) NULL,
	output_type varchar(30) NULL,
	output_format varchar(50) NULL,
	output_data_type varchar(30) NULL,
	pre_or_post int2 NULL,
	description varchar(200) NULL,
	CONSTRAINT tb_app_pre_post_actionsmst_pkey PRIMARY KEY (id)
);


-- datamodel.tb_app_pre_post_actionsmst foreign keys
ALTER TABLE datamodel.tb_app_pre_post_actionsmst ADD CONSTRAINT action_type_fk FOREIGN KEY ("type") REFERENCES datamodel.tb_app_actiontypemst(id);