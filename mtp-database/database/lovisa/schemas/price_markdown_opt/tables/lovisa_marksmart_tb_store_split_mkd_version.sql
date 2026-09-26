 --liquibase formatted sql
    --changeset rohankumar.sinha:lovisa_marksmart_tb_store_split_mkd_version stripComments:false splitStatements:false context:lovisa_marksmart_tb_store_split_mkd_version
    --comment: initial changeset for lovisa_marksmart_tb_store_split_mkd_version



CREATE TABLE price_markdown_opt.lovisa_marksmart_tb_store_split_mkd_version (
	version_code int4 NOT NULL,
	product_id int4 NOT NULL,
	store_id int4 NOT NULL,
	s0_id int4 NULL,
	s1_id int4 NULL,
	week_start_date date NOT NULL,
	store_ratio numeric NULL,
	CONSTRAINT tb_store_split_mkd_pk_2 PRIMARY KEY (version_code, product_id, store_id, week_start_date)
)
PARTITION BY LIST (version_code);
CREATE INDEX idx_l3cid_weekstartdate_tb_store_split_mkd_2 ON price_markdown_opt.lovisa_marksmart_tb_store_split_mkd_version USING btree (version_code, product_id, store_id, week_start_date);



