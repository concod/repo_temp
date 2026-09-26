--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:ticket_type_master stripComments:false splitStatements:false context:VS_inv_smart labels:VS-174
--comment: initial changeset for ticket_type_master
CREATE TABLE inventory_smart.ticket_type_master (
	syncstartdatetime timestamp NULL,
	ticket_type varchar NULL,
	ticket_type_description varchar NULL,
	ticket_type_ticket_type_description varchar NULL
);

