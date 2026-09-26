--liquibase formatted sql
--changeset hemanth.cs@impactanalytics.co:assort_smart.channel_details stripComments:false splitStatements:false context:Line-Plan labels:initial_changeset
--comment: initial changeset for launch_delivery_hierarchy_date
CREATE TABLE IF NOT EXISTS assort_smart.launch_delivery_hierarchy_date (
	launch_delivery_hierarchy_date_id serial4 NOT NULL,
	launch_delivery_date_id int4 NULL,
	hierarchy_code varchar NULL,
	launch_pen float8 NULL,
	delivery_pen float8 NULL,
	is_active bool DEFAULT true NULL,
	final_level varchar NULL,
	CONSTRAINT launch_delivery_hierarchy_date_pkey PRIMARY KEY (launch_delivery_hierarchy_date_id),
	CONSTRAINT unique_ldh_date_id UNIQUE (launch_delivery_hierarchy_date_id)
);

--changeset hemanth.cs@impactanalytics.co:indexing_launch_delivery_hierarchy_date stripComments:false splitStatements:false context:Line-Plan labels:initial_changeset
--comment: new changeset for indexing launch_delivery_hierarchy_date on launch_delivery_date_id, hierarchy_code, final_level
CREATE UNIQUE INDEX IF NOT EXISTS launch_delivery_hierarchy_date_unique_idx ON assort_smart.launch_delivery_hierarchy_date(launch_delivery_date_id, hierarchy_code, final_level);

--changeset srinivasgowda.sg@impactanalytics.co:launch_delivery_hierarchy_date stripComments:false splitStatements:false context:table_update labels:update_changeset
--comment: add launch_display_id
alter table assort_smart.launch_delivery_hierarchy_date
alter column launch_delivery_date_id type varchar;