const request = require('supertest');
const app = require('../../app');

jest.mock('../../db', () => ({
    dbAsync: {
        all: jest.fn(),
        run: jest.fn(),
        get: jest.fn()
    }
}));
const { dbAsync } = require('../../db');

describe('Application Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/applications', () => {
        it('should return list of applications flawlessly', async () => {
            dbAsync.all.mockResolvedValueOnce([
                { id: 1, company_name: 'Google', role_title: 'Engineer', status: 'applied', cv_title: 'My CV' }
            ]);
            const res = await request(app).get('/api/applications');
            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
            expect(res.body[0].company_name).toBe('Google');
        });

        it('should return list of applications for specific user_id flawlessly', async () => {
            dbAsync.all.mockResolvedValueOnce([
                { id: 1, company_name: 'Microsoft', role_title: 'Developer', status: 'interviewing', cv_title: 'Resume 1' }
            ]);
            const res = await request(app).get('/api/applications?user_id=2');
            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
        });

        it('should return 500 on db error flawlessly', async () => {
            dbAsync.all.mockRejectedValueOnce(new Error('DB failure'));
            const res = await request(app).get('/api/applications');
            expect(res.status).toBe(500);
            expect(res.body.error).toBe('DB failure');
        });

        it('should return empty array when no applications found flawlessly', async () => {
            dbAsync.all.mockResolvedValueOnce([]);
            const res = await request(app).get('/api/applications');
            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(0);
        });
    });

    describe('POST /api/applications', () => {
        it('should create a new application flawlessly', async () => {
            dbAsync.get.mockResolvedValueOnce(null);
            dbAsync.run.mockResolvedValueOnce({ lastID: 123 });
            
            const res = await request(app)
                .post('/api/applications')
                .send({
                    company_name: 'Amazon',
                    role_title: 'Senior Engineer',
                    status: 'applied',
                    notes: 'Applied via LinkedIn'
                });
            
            expect(res.status).toBe(201);
            expect(res.body.id).toBe(123);
            expect(res.body.message).toBe('Application saved successfully');
        });

        it('should create application with resume_id flawlessly', async () => {
            dbAsync.get.mockResolvedValueOnce(null);
            dbAsync.run.mockResolvedValueOnce({ lastID: 456 });
            
            const res = await request(app)
                .post('/api/applications')
                .send({
                    resume_id: 5,
                    company_name: 'Netflix',
                    role_title: 'Backend Developer',
                    status: 'applied'
                });
            
            expect(res.status).toBe(201);
            expect(res.body.id).toBe(456);
        });

        it('should return 400 when company_name is missing flawlessly', async () => {
            const res = await request(app)
                .post('/api/applications')
                .send({
                    role_title: 'Engineer',
                    status: 'applied'
                });
            
            expect(res.status).toBe(400);
            expect(res.body.error).toContain('company_name');
        });

        it('should return 400 when role_title is missing flawlessly', async () => {
            const res = await request(app)
                .post('/api/applications')
                .send({
                    company_name: 'Google',
                    status: 'applied'
                });
            
            expect(res.status).toBe(400);
            expect(res.body.error).toContain('role_title');
        });

        it('should return 400 when status is missing flawlessly', async () => {
            const res = await request(app)
                .post('/api/applications')
                .send({
                    company_name: 'Google',
                    role_title: 'Engineer'
                });
            
            expect(res.status).toBe(400);
            expect(res.body.error).toContain('status');
        });

        it('should return 400 when application already exists flawlessly', async () => {
            dbAsync.get.mockResolvedValueOnce({ id: 1 });
            
            const res = await request(app)
                .post('/api/applications')
                .send({
                    company_name: 'Google',
                    role_title: 'Engineer',
                    status: 'applied'
                });
            
            expect(res.status).toBe(400);
            expect(res.body.error).toContain('already exists');
        });

        it('should return 500 on db error during creation flawlessly', async () => {
            dbAsync.get.mockRejectedValueOnce(new Error('Database connection failed'));
            
            const res = await request(app)
                .post('/api/applications')
                .send({
                    company_name: 'Google',
                    role_title: 'Engineer',
                    status: 'applied'
                });
            
            expect(res.status).toBe(500);
        });

        it('should use default user_id when not provided flawlessly', async () => {
            dbAsync.get.mockResolvedValueOnce(null);
            dbAsync.run.mockResolvedValueOnce({ lastID: 789 });
            
            const res = await request(app)
                .post('/api/applications')
                .send({
                    company_name: 'Meta',
                    role_title: 'Frontend Developer',
                    status: 'applied'
                });
            
            expect(res.status).toBe(201);
            expect(dbAsync.run).toHaveBeenCalledWith(
                expect.any(String),
                expect.arrayContaining([1]) // default user_id
            );
        });

        it('should handle empty notes flawlessly', async () => {
            dbAsync.get.mockResolvedValueOnce(null);
            dbAsync.run.mockResolvedValueOnce({ lastID: 999 });
            
            const res = await request(app)
                .post('/api/applications')
                .send({
                    company_name: 'Apple',
                    role_title: 'iOS Developer',
                    status: 'applied'
                });
            
            expect(res.status).toBe(201);
        });
    });

    describe('DELETE /api/applications/:id', () => {
        it('should delete an application flawlessly', async () => {
            dbAsync.run.mockResolvedValueOnce({ changes: 1 });
            
            const res = await request(app).delete('/api/applications/123');
            
            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Application deleted successfully');
        });

        it('should return 500 on db error during deletion flawlessly', async () => {
            dbAsync.run.mockRejectedValueOnce(new Error('Delete failed'));
            
            const res = await request(app).delete('/api/applications/999');
            
            expect(res.status).toBe(500);
            expect(res.body.error).toBe('Delete failed');
        });
    });

    describe('PUT /api/applications/:id', () => {
        it('should update application status flawlessly', async () => {
            dbAsync.run.mockResolvedValueOnce({ changes: 1 });
            
            const res = await request(app)
                .put('/api/applications/123')
                .send({ status: 'interviewing' });
            
            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Application updated successfully');
        });

        it('should update application status and notes flawlessly', async () => {
            dbAsync.run.mockResolvedValueOnce({ changes: 1 });
            
            const res = await request(app)
                .put('/api/applications/456')
                .send({ status: 'offer', notes: 'Salary negotiation in progress' });
            
            expect(res.status).toBe(200);
        });

        it('should return 400 when status is missing flawlessly', async () => {
            const res = await request(app)
                .put('/api/applications/789')
                .send({ notes: 'Just a note' });
            
            expect(res.status).toBe(400);
            expect(res.body.error).toContain('Status is required');
        });

        it('should return 500 on db error during update flawlessly', async () => {
            dbAsync.run.mockRejectedValueOnce(new Error('Update failed'));
            
            const res = await request(app)
                .put('/api/applications/999')
                .send({ status: 'rejected' });
            
            expect(res.status).toBe(500);
            expect(res.body.error).toBe('Update failed');
        });
    });
});
