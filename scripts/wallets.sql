-- Create user table

DROP TABLE IF EXISTS public.wallets;

CREATE TABLE public.wallets (
	wallet_id			VARCHAR(36)		NOT NULL	PRIMARY KEY,
	address				VARCHAR(128)	NOT NULL,
	private_key 		VARCHAR(128)	NOT NULL
);
