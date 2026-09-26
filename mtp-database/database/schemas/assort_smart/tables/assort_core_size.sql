--liquibase formatted sql
--changeset liquibase:assort_core_size stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for assort_core_size
CREATE TABLE assort_smart.assort_core_size (
	l0_name varchar NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	l3_name varchar NULL,
	"size" varchar NULL,
	core bool NULL,
	store_type varchar NULL
);