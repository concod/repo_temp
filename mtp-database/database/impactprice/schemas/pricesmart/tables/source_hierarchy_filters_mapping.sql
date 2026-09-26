--liquibase formatted sql
--changeset harsh.singh@impactanalytics.co:source_hierarchy_filters_mapping  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for source_hierarchy_filters_mapping

CREATE TABLE pricesmart.source_hierarchy_filters_mapping (
	source_id int4 NOT NULL,
	request_key text NOT NULL,
	id_column text NOT NULL,
	value_column text NULL,
	CONSTRAINT pk_source_hierarchy_filters_mapping PRIMARY KEY (source_id, request_key),
	CONSTRAINT fk_filter_source FOREIGN KEY (source_id) REFERENCES pricesmart.filter_source_table_mapping(id) ON DELETE RESTRICT ON UPDATE CASCADE
);