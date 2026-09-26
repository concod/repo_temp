 --liquibase formatted sql
    --changeset rohankumar.sinha:lovisa_marksmart_tb_day_split_mkd_version stripComments:false splitStatements:false context:lovisa_marksmart_tb_day_split_mkd_version
    --comment: initial changeset for lovisa_marksmart_tb_day_split_mkd_version


CREATE TABLE price_markdown_opt.lovisa_marksmart_tb_day_split_mkd_version (
	version_code int4 NOT NULL,
	l3_cid int4 NOT NULL,
	"date" date NOT NULL,
	week_start_date date NOT NULL,
	day_ratio_bnm numeric NOT NULL,
	day_ratio_ecom numeric NOT NULL,
	CONSTRAINT tb_day_split_mkd_pk_2 PRIMARY KEY (version_code, l3_cid, date)
)
PARTITION BY LIST (version_code);
CREATE INDEX idx_l3cid_weekstartdate_tb_day_split_mkd_2 ON price_markdown_opt.lovisa_marksmart_tb_day_split_mkd_version USING btree (l3_cid, week_start_date);