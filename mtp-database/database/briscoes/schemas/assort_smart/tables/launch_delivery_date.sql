--liquibase formatted sql
--changeset kumar.shubham@impactanalytics.co:assort_smart.launch_delivery_date_briscoes stripComments:false splitStatements:false context:Line-Plan-briscoes labels:initial_changeset_briscoes
--comment: initial changeset for launch_delivery_date for briscoes

CREATE TABLE IF NOT EXISTS assort_smart.launch_delivery_date (
	launch_delivery_date_id serial4 NOT NULL,
	season_code int4 NULL,
	channel int4 NULL,
	launch int4 NULL,
	delivery int4 NULL,
	launch_start_date date NULL,
	delivery_start_date date NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	hierarchy_code varchar NULL,
	CONSTRAINT launch_delivery_date_pkey PRIMARY KEY (launch_delivery_date_id)
);
CREATE INDEX IF NOT EXISTS idx_launch_delivery_date_season_code ON assort_smart.launch_delivery_date USING btree (season_code);

--changeset hemanth.cs@impactanalytics.co:assort_smart.launch_delivery_date_unique_constraint stripComments:false splitStatements:false context:table_update labels:update_changeset
--comment: update changeset for launch_delivery_date unique constraint
ALTER TABLE assort_smart.launch_delivery_date
ADD CONSTRAINT unique_launch_delivery_date_combination 
UNIQUE (season_code, channel, launch, delivery, hierarchy_code);

--changeset mayank.bhardwaj@impactanalytics.co:assort_smart.launch_delivery_date_add_display_names stripComments:false splitStatements:false context:table_update labels:update_changeset
--comment: add launch_display_name and delivery_display_name columns
ALTER TABLE assort_smart.launch_delivery_date
ADD COLUMN IF NOT EXISTS launch_display_name VARCHAR NULL,
ADD COLUMN IF NOT EXISTS delivery_display_name VARCHAR NULL;

--changeset srinivasgowda.sg@impactanalytics.co:launch_delivery_date_add_display_names stripComments:false splitStatements:false context:table_update labels:update_changeset
--comment: add launch_display_id
ALTER TABLE assort_smart.launch_delivery_date
DROP CONSTRAINT launch_delivery_date_pkey;
ALTER TABLE assort_smart.launch_delivery_date
drop COLUMN launch_delivery_date_id ;
ALTER TABLE assort_smart.launch_delivery_date
ADD COLUMN launch_delivery_date_id varchar
GENERATED ALWAYS AS (
    (season_code || '-' ||
     launch || '-' ||
     channel || '-' ||
     delivery || '-' ||
     hierarchy_code)::varchar
) STORED;


ALTER TABLE assort_smart.launch_delivery_date
ADD CONSTRAINT launch_delivery_date_pkey
PRIMARY KEY (launch_delivery_date_id);

--changeset vishal.hosamani@impactanalytics.co:add_is_tool_generated stripComments:false splitStatements:false context:table_update labels:update_changeset
--comment: add is_tool_generated column
ALTER TABLE assort_smart.launch_delivery_date
ADD COLUMN IF NOT EXISTS is_tool_generated boolean DEFAULT FALSE;