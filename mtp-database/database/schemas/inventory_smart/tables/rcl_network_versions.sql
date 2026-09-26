--liquibase formatted sql
--changeset linu.nazil:rcl_network_versions_v1 stripComments:false splitStatements:false context:MTP-64270_1 labels:MTP-82260
--comment: rcl_network_versions
CREATE TABLE IF NOT EXISTS inventory_smart.rcl_network_versions
(	
    version_code integer NOT NULL,
    product_code character varying NOT NULL,
    l0_name character varying NOT NULL,
    rule_code integer null,
    rcl_code integer NULL,
    supply_network integer,
    route_id int4 not null,
    route_type_id int4,
	supply_route_name citext not null,
	source_node_id int4,
	source_type varchar,
	source_name varchar not null,
	source_code varchar not null,
	destination_node_id int4,
	destination_type varchar,
	destination_name varchar not null,
	destination_code varchar not null,
	shipping_mode citext not null,
	is_terminal bool not null,
	is_primary bool not null,
	lead_time int4 not null,
	priority int4 not null
) PARTITION BY LIST (version_code);


--changeset nibeel.yunus:rcl_network_versions_v1 stripComments:false splitStatements:false context:add article column labels:add article column
--comment: rcl_network_versions

ALTER TABLE inventory_smart.rcl_network_versions ADD COLUMN IF NOT EXISTS article character varying NOT NULL;