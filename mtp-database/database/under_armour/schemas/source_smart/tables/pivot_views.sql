--liquibase formatted sql
--changeset mayank.mukundam:pivot_views stripComments:false splitStatements:false context:Release_1_1 labels:adding pivot view insert table
--comment: adding pivot views table

CREATE TABLE source_smart.pivot_views (
	pivot_name varchar(255) NOT NULL,
	"rows" _text NOT NULL,
	"columns" _text NOT NULL,
	version_values _text NOT NULL,
	l0_name varchar(255) NOT NULL,
	measures _text NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	created_by varchar(255) NULL,
	updated_by varchar(255) NULL,
	CONSTRAINT pivot_views_unique UNIQUE (pivot_name)
);
CREATE INDEX pivot_views_l0_name_idx ON source_smart.pivot_views USING btree (l0_name);