const knex = require('knex')
const app = require('../src/app')
const supertest = require('supertest')
const { makeBookmarksArray, makeMaliciousBookmark } = require('./bookmarks-fixture')

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
})