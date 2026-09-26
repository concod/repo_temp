--liquibase formatted sql
--changeset liquibase:fiscal_calendar_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for fiscal_calendar
CREATE TABLE if not exists assort.fiscal_calendar (
    calendar_date date,
    fy integer,
    fm integer,
    fw integer,
    fd integer,
    fw_start_date date,
    fy_fw integer
);
CREATE INDEX fiscal_calendar_calendar_date_idx ON assort.fiscal_calendar USING btree (calendar_date);
