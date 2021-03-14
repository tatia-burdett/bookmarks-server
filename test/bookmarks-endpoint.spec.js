const knex = require('knex')
const app = require('../src/app')
const supertest = require('supertest')
const { makeBookmarksArray, makeMaliciousBookmark } = require('./bookmarks-fixture')
const { expect } = require('chai')

describe('Bookmarks Endpoints', () => {
  let db

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL
    })
    app.set('db', db)
  })

  after('disconnect from db', () => db.destroy())

  before('cleanup', () => db('bookmarks').truncate())

  afterEach('cleanup', () => db('bookmarks').truncate())

  // GET /bookmarks endpoint
  describe('GET /bookmarks', () => { 
    context(`Given no bookmarks`, () => { // GIVE NO BOOKMARKS
      it(`responds with 200 and an empty list`, () => {
        return supertest(app)
          .get('/bookmarks')
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200, [])
      })
    })

    context('Given there are bookmarks in the database', () => { // GIVEN BOOMARKS
      const testBookmarks = makeBookmarksArray()

      beforeEach('insert bookmarks', () => {
        return db
          .into('bookmarks')
          .insert(testBookmarks)
      })

      it('responds 200 and returns all bookmarks', () => {
        return supertest(app)
          .get('/bookmarks')
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200, testBookmarks)
      })
    })
  })

  // GET /bookmarks/:id endpoint
  describe('GET /bookmarks/:id', () => {
    context('given no bookmarks', () => { // GIVEN NO BOOMARKS
      it('responds with 404', () => {
        const articleId = 123456
        return supertest(app)
          .get(`/bookmarks/${articleId}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(404, { error: { message: `Bookmark not found` }})
      })
    })

    context('given there are bookmarks', () => { // GIVEN BOOKMARKS
      const testBookmark = makeBookmarksArray()

      beforeEach('insert articles', () => {
        return db
          .into('bookmarks')
          .insert(testBookmark)
      })

      it('responds with 200 and the specified bookmark', () => {
        const bookmarkId = 2
        const expectedBookmark = testBookmark[bookmarkId - 1]
        return supertest(app)
          .get(`/bookmarks/${bookmarkId}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200, expectedBookmark)
      })
    })
  })

  // POST /bookmark
  describe('POST /bookmarks', () => {
    it('creates a bookmark, responding with 201 and the new bookmark', () => {
      const newBookmark = {
        title: 'Test New Bookmark',
        url: 'www.test-url.example',
        description: 'Test new description...',
        rating: '5'
      }
      return supertest(app)
        .post('/bookmarks')
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .send(newBookmark)
        .expect(201)
        .expect(res => {
          expect(res.body.title).to.eql(newBookmark.title),
          expect(res.body.url).to.eql(newBookmark.url),
          expect(res.body.description).to.eql(newBookmark.description),
          expect(res.body.rating).to.eql(newBookmark.rating),
          expect(res.body).to.have.property('id')
          expect(res.headers.location).to.eql(`/bookmarks/${res.body.id}`)
        })
        .then(res => 
          supertest(app)
            .get(`/bookmarks/${res.body.id}`)
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .expect(res.body)
        )
    })

    const requiredFields = ['title', 'url', 'rating']

    requiredFields.forEach(field => {
      const newBookmark = {
        title: 'Test New Bookmark',
        url: 'www.test-url.example',
        rating: '5'
      }

      it(`responds with 400 and an error when the ${field} is empty`, () => {
        delete newBookmark[field]

        return supertest(app)
          .post('/bookmarks')
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .send(newBookmark)
          .expect(400, {
            error: { message: `Missing '${field}' in request body` }
          })
      })
    })
  })

  // DELETE /bookmark/:id
  describe(`DELETE /bookmarks/:id`, () => {
    context('Given no bookmark', () => {
      it('responds with 404', () => {
        const bookmarkId = 123456
        return supertest(app)
          .delete(`/bookmarks/${bookmarkId}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(404, { error: { message: `Bookmark not found` }})
      })
    })
  })
})