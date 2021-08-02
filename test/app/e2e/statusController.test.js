const supertest = require('supertest');
const containerFactory = require('../testContainerFactory');

const container = containerFactory.createContainer();

describe('statusController', () => {
  let config;
  let dbService;
  let request;
  let res;

  // API Keys
  let fakeApikey;
  let apikeyHeader;

  beforeEach(() => {
    config = container.get('config');
    dbService = container.get('dbService');
    request = supertest(container.get('app'));

    // API Keys
    fakeApikey = 'fake-apikey';
    apikeyHeader = config.services.apikeys.header;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('/ping', () => {
    const path = '/ping';

    describe('GET', () => {
      it('should respond with correct status and body', () =>
        request
          .get(path)
          .set(apikeyHeader, fakeApikey)
          .expect('Content-Type', /json/)
          .expect(200, { status: 'ok' }));
    });
  });

  describe('/health', () => {
    const path = '/health';

    describe('GET', () => {
      const spyDbService = {};

      describe('when database is up', () => {
        beforeEach(async () => {
          spyDbService.getDatabaseHealth = jest
            .spyOn(dbService, 'getDatabaseHealth')
            .mockReturnValue(true);

          res = await request.get(path).set(apikeyHeader, fakeApikey);
        });

        it('should respond with correct status and body', () => {
          expect(res.status).toEqual(200);
          expect(res.header['content-type']).toMatch(/json/);
          expect(res.body).toEqual({ database: 'UP' });
        });

        it('should have called dbService once', () =>
          expect(spyDbService.getDatabaseHealth).toHaveBeenCalledTimes(1));
      });

      describe('when database is down', () => {
        beforeEach(async () => {
          spyDbService.getDatabaseHealth = jest
            .spyOn(dbService, 'getDatabaseHealth')
            .mockReturnValue(false);

          res = await request.get(path).set(apikeyHeader, fakeApikey);
        });

        it('should respond with correct status and body', () => {
          expect(res.status).toEqual(200);
          expect(res.header['content-type']).toMatch(/json/);
          expect(res.body).toEqual({ database: 'DOWN' });
        });

        it('should have called dbService once', () =>
          expect(spyDbService.getDatabaseHealth).toHaveBeenCalledTimes(1));
      });
    });
  });
});
