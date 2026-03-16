const request = require('supertest');
const app = require('../app');

describe('Health Check API', () => {
  it('should return 200 OK and a message', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });
});
