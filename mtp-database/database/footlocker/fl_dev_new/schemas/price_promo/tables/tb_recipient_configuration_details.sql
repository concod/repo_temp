--liquibase formatted sql
--changeset shrrayan.sheel@impactanalytics.co:tb_recipient_configuration_details stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Initial changeset for price_promo.tb_recipient_configuration_details

CREATE TABLE price_promo.tb_recipient_configuration_details (
	id serial4 NOT NULL,
	send_email_to_vendors bool DEFAULT false NOT NULL,
	send_email_to_merchants bool DEFAULT false NOT NULL,
    send_email_to_stakeholders bool DEFAULT false NOT NULL,
	promo_sync_direction_status int2 NOT NULL,
	CONSTRAINT tb_recipient_configuration_details_pkey PRIMARY KEY (id)
);


--changeset shrrayan.sheel@impactanalytics.co:tb_recipient_configuration_details_211020251547 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added column send_email_to_multiple_vendors
ALTER TABLE price_promo.tb_recipient_configuration_details
ADD COLUMN send_email_to_multiple_vendors bool DEFAULT false NOT NULL;