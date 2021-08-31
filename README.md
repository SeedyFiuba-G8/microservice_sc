# Smart Contracts Microservice

Written in JavaScript (Node.js).


## DISCLAIMER: ¡Currently offline! :broken_heart:

Since we used **Heroku** to host our microservices, as they offer a limited number of free applications, we decided to remove them. CI/CD has been manually disabled.

If you were to deploy this application, you should:

- Manually enable the workflow from GitHub Actions.
- Create your Heroku app to host our `main` (and optionally `dev` branch). Keep in mind this Heroku app should have the following `ENV_VARS`:
  - `NODE_ENV`: `production`, `stage`.
  - `INFURA_API_KEY`.
  - `DATABASE_URL`.
  - `MNEMONIC`.
  - `APIKEYS_KEY`: the master key to auth with our [API Keys microservice](https://github.com/SeedyFiuba-G8/microservice_apikeys).
  - `DATABASE_URL`: url to PostgreSQL database.
  - NewRelic monitoring: `NEW_RELIC_LICENSE_KEY`, `NEW_RELIC_APP_NAME`.
  - SumoLogic logs: `SUMOLOGIC_HOST`, `SUMOLOGIC_PATH`.
  - `[LOGGER_LEVEL]` _(self-explaining)_. Possible values: `debug`, `info`, `warn`, `error`.
- Setup **secrets** needed by our workflow (mainly Heroku credentials and application name).
- **Happy coding!**