--liquibase formatted sql
    --changeset kumaran:tb_spike_factor stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
    --comment: initial changeset for tb_spike_factor

CREATE TABLE price_markdown_opt.tb_spike_factor (
	l2_cid int4 NULL,
	lifecycle varchar(200) NULL,
	md_week int4 NULL,
	md_day int4 NULL,
	bnm_spike_factor float8 NULL,
	ecom_spike_factor float8 NULL
);