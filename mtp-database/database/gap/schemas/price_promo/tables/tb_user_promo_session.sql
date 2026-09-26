--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:tb_user_promo_session stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Initial changeset for price_promo.tb_user_promo_session

CREATE TABLE price_promo.tb_user_promo_session (
	promo_id int4 NOT NULL,
	user_id int4 NOT NULL,
	session_id varchar NOT NULL,
	CONSTRAINT tb_user_promo_session_promo_master_fk FOREIGN KEY (promo_id) REFERENCES price_promo.promo_master(promo_id),
	CONSTRAINT tb_user_promo_session_user_master_fk FOREIGN KEY (user_id) REFERENCES "global".user_master(user_code)
);