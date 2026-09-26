--liquibase formatted sql
--changeset akashkumar.rana@impactanalytics.co:table_set_up_in_test_01 stripComments:false splitStatements:false context:Release_1_0_02 labels:levis_test_02
--comment: initial changeset 02
--rollback: DROP TABLE IF EXISTS size_smart.price_vas_derived;

CREATE TABLE IF NOT EXISTS size_smart.price_vas_derived (
    l2_code varchar(50) NOT NULL,
    display_article varchar(100) NOT NULL,
    season varchar(20) NOT NULL,
    "year" int4 NOT NULL,
    "Price" float8 NULL,
    "VAS_FOLD_CODE" varchar(50) NULL,
    "VAS_RFID" varchar(50) NULL,
    "VAS_1" varchar(50) NULL,
    "VAS_2" varchar(50) NULL,
    "VAS_3" varchar(50) NULL,
    "VAS_4" varchar(50) NULL,
    "VAS_5" varchar(50) NULL,
    "VAS_6" varchar(50) NULL,
    "VAS_7" varchar(50) NULL,
    "VAS_8" varchar(50) NULL,
    CONSTRAINT price_vas_derived_pkey PRIMARY KEY (l2_code, display_article, season, year)
);
