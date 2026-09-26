
-- liquibase formatted sql
-- changeset akashkumar.rana@impactanalytics.co:tb_pack_plan_style_color stripComments:false splitStatements:false context:tb_pack_plan_style_color labels:tb_pack_plan_style_color
-- comment: update changeset for tb_pack_plan_style_color

CREATE TABLE size_smart.tb_pack_plan_style_color (
    plan_code int4 NOT NULL,
    style_color varchar not NULL,
    UNIQUE (plan_code, style_color)
);