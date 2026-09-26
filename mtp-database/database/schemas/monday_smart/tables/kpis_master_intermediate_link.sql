--liquibase formatted sql
--changeset sivaprasath.vadivel:kpis_master_intermediate_link stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for kpis_master_intermediate_link

CREATE TABLE monday_smart.kpis_master_intermediate_link (
	kpi_name varchar NOT NULL,
	intermediate_column varchar NOT NULL,
	CONSTRAINT kpi_intermediate_pk PRIMARY KEY (kpi_name, intermediate_column),
	CONSTRAINT kpi_intermediate_fk FOREIGN KEY (intermediate_column) REFERENCES monday_smart.kpis_master_intermediate_v2(intermediate_column) ON DELETE CASCADE,
	CONSTRAINT kpi_master_fk FOREIGN KEY (kpi_name) REFERENCES monday_smart.kpis_master_v2("name") ON DELETE CASCADE
);