--liquibase formatted sql
--changeset liquibase:dc_split_ratio_cb_use stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dc_split_ratio for cb

CREATE TABLE IF NOT EXISTS inventory_smart.dc_split_ratio (
	id serial4 NOT NULL,
	article varchar(100) NULL,
	product_code varchar(100) NOT NULL,
	"size" varchar(100) NULL,
	loc_code varchar(100) NOT NULL,
	channel varchar(100) NOT NULL,
	fiscal_year_week int4 NOT NULL,
	peneteration float8 NULL,
	CONSTRAINT pk_dc_split_ratio PRIMARY KEY (product_code, loc_code, channel, fiscal_year_week)
);

--changeset kaustubh.gupta:column_rename_if_exists_added stripComments:false splitStatements:false context:Release_1_0 labels:column_rename_if_exists_added
--comment: column_rename_if_exists_added
alter table inventory_smart.dc_split_ratio drop column IF EXISTS peneteration;
ALTER TABLE inventory_smart.dc_split_ratio add COLUMN  if not exists penetration float8 null;