--liquibase formatted sql
--changeset liquibase:store_holiday_calendar stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_holiday_calendar
CREATE TABLE inventory_smart.store_holiday_calendar (
	store_code varchar NOT NULL,
	holiday_date date NOT NULL,
	CONSTRAINT store_holiday_calendar_un UNIQUE (store_code, holiday_date)
);
ALTER TABLE inventory_smart.store_holiday_calendar ADD CONSTRAINT store_holiday_calendar_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE;
