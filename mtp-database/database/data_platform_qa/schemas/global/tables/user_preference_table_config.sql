--liquibase formatted sql
--changeset liquibase:user_preference_table_config stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for user_preference_table_config
CREATE TABLE "global".user_preference_table_config (
	tc_code int4 NOT NULL,
	user_code int4 NOT NULL,
	preference jsonb NULL,
	CONSTRAINT user_preference_table_config_un UNIQUE (tc_code, user_code),
	CONSTRAINT user_preference_table_config_fk FOREIGN KEY (tc_code) REFERENCES "global".table_configurations(tc_code),
	CONSTRAINT user_preference_table_config_fk_1 FOREIGN KEY (user_code) REFERENCES "global".user_master(user_code)
);

--changeset kamaleshwaran.k@impactanalytics.co:user_preference_table_config_1 stripComments:false splitStatements:false context:Release_2 labels:initial changeset for updating the primary key 
--comment: initial changeset for updating the primary key 

ALTER TABLE global.user_preference_table_config 
ADD CONSTRAINT user_preference_table_config_pk 
PRIMARY KEY (tc_code, user_code);

ALTER TABLE global.user_preference_table_config 
DROP CONSTRAINT user_preference_table_config_un;