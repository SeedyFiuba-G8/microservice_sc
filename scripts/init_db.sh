#! /bin/sh

# Remember to specify the desired database. In this case, it will
# create a projects table in database sf_core by default.
DEFAULT_URL='postgres://postgres:postgres@localhost:5432/sf_sc'
: "${DATABASE_URL:=$DEFAULT_URL}"

cd ./scripts
echo "Seedy FIUBA - Smart contract microservice\n"

echo "> CREATING TABLE 'wallets':"
psql $DATABASE_URL -f create_tables.sql

