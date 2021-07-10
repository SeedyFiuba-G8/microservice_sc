#! /bin/sh

DEFAULT_URL='postgres://postgres:postgres@localhost:5432/postgres'
: "${DATABASE_URL:=$DEFAULT_URL}"

echo "Seedy FIUBA - Smart contracts microservice\n"

echo "> CREATE DATABASE 'sf_sc':"
psql $DATABASE_URL -f create_db.sql

