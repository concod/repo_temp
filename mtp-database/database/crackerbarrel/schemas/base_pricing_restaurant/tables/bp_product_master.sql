--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:bp_product_master_11 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_product_master_11

DROP TABLE IF EXISTS base_pricing_restaurant.bp_product_master CASCADE;

CREATE TABLE IF NOT EXISTS base_pricing_restaurant.bp_product_master (
	product_id int4 NOT NULL,
	product_name varchar(500) NULL,
	product_image text NULL,
	active bool NULL,
	usable bool NULL,
	l0_id varchar(15) NULL,
	l0_name varchar(100) NULL,
	l0_cuq varchar(500) NULL,
	l0_cid int4 NULL,
	l1_id varchar(15) NULL,
	l1_name varchar(100) NULL,
	l1_cuq varchar(500) NULL,
	l1_cid int4 NULL,
	l2_id varchar(15) NULL,
	l2_name varchar(100) NULL,
	l2_cuq varchar(500) NULL,
	l2_cid int4 NULL,
	CONSTRAINT bp_product_master_pkey PRIMARY KEY (product_id)
);
CREATE INDEX IF NOT EXISTS idx_bp_product_master_id1 ON base_pricing_restaurant.bp_product_master USING btree (product_id);
CREATE INDEX IF NOT EXISTS idx_bp_product_master_id2 ON base_pricing_restaurant.bp_product_master USING btree (l0_cid, l1_cid);

--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:bp_product_master_12 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_product_master_12
ALTER TABLE base_pricing_restaurant.bp_product_master
ADD COLUMN IF NOT EXISTS product_code varchar(100) NULL;


--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:bp_product_master_13 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_product_master_13
ALTER TABLE base_pricing_restaurant.bp_product_master
ALTER COLUMN product_code SET NOT NULL;