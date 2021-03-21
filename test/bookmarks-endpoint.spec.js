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
      connection: process.env.TEST_DATABASE_URL
    })
    app.set('db', db)
  })

  after('disconnect from db', () => db.destroy())

  before('cleanup', () => db('bookmarks').truncate())

  afterEach('cleanup', () => db('bookmarks').truncate())

  // GET /bookmarks endpoint
  describe('GET /api/bookmarks', () => { 
    context(`Given no bookmarks`, () => { // GIVE NO BOOKMARKS
      it(`responds with 200 and an empty list`, () => {
        return supertest(app)
          .get('/api/bookmarks')
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
          .get('/api/bookmarks')
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200, testBookmarks)
      })
    })

    context(`Given an XSS attack bookmark`, () => { // XSS ATTACK
      const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark()

      beforeEach(`Insert malicious bookmark`, () => {
        return db
          .into('bookmarks')
          .insert([ maliciousBookmark ])
      })

      it(`removes xss attack content`, () => {
        return supertest(app)
          .get('/api/bookmarks')
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200)
          .expect(res => {
            expect(res.body[0].title).to.eql(expectedBookmark.title)
            expect(res.body[0].description).to.eql(expectedBookmark.description)
          })
      })
    })
  })

  // GET /bookmarks/:id endpoint
  describe('GET /api/bookmarks/:id', () => {
    context('given no bookmarks', () => { // GIVEN NO BOOMARKS
      it('responds with 404', () => {
        const articleId = 123456
        return supertest(app)
          .get(`/api/bookmarks/${articleId}`)
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
          .get(`/api/bookmarks/${bookmarkId}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200, expectedBookmark)
      })
    })

    context(`Given an xss attack bookmark`, () => {
      const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark()

      beforeEach(`insert a malicious bookmark`, () => {
        return db
          .into('bookmarks')
          .insert([ maliciousBookmark ])
      })

      it(`removes xss attack content`, () => {
        return supertest(app)
          .get(`/api/bookmarks/${maliciousBookmark.id}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200)
          .expect(res => {
            expect(res.body.title).to.eql(expectedBookmark.title)
            expect(res.body.description).to.eql(expectedBookmark.description)
          })
      })
    })
  })

  // POST /bookmarks
  describe('POST /api/bookmarks', () => {
    it('creates a bookmark, responding with 201 and the new bookmark', () => {
      const newBookmark = {
        title: 'Test New Bookmark',
        url: 'www.test-url.example',
        description: 'Test new description...',
        rating: 5
      }
      return supertest(app)
        .post('/api/bookmarks')
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .send(newBookmark)
        .expect(201)
        .expect(res => {
          expect(res.body.title).to.eql(newBookmark.title),
          expect(res.body.url).to.eql(newBookmark.url),
          expect(res.body.description).to.eql(newBookmark.description),
          expect(res.body.rating).to.eql(newBookmark.rating),
          expect(res.body).to.have.property('id')
          expect(res.headers.location).to.eql(`/api/bookmarks/${res.body.id}`)
        })
        .then(res => 
          supertest(app)
            .get(`/api/bookmarks/${res.body.id}`)
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .expect(res.body)
        )
    })

    const requiredFields = ['title', 'url', 'rating']

    requiredFields.forEach(field => {
      const newBookmark = {
        title: 'Test New Bookmark',
        url: 'www.test-url.example',
        rating: 5
      }

      it(`responds with 400 and an error when the ${field} is empty`, () => {
        delete newBookmark[field]

        return supertest(app)
          .post('/api/bookmarks')
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .send(newBookmark)
          .expect(400, {
            error: { message: `Missing '${field}' in request body` }
          })
      })
    })
  })

  // DELETE /bookmarks/:id
  describe(`DELETE /api/bookmarks/:id`, () => {
    context('Given no bookmark', () => {
      it('responds with 404', () => {
        const bookmarkId = 123456
        return supertest(app)
          .delete(`/api/bookmarks/${bookmarkId}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(404, { error: { message: `Bookmark not found` }})
      })
    })

    context('Given there are bookmarks in the databse', () => {
      const testBookmarks = makeBookmarksArray()

      beforeEach('insert bookmark', () => {
        return db
          .into('bookmarks')
          .insert(testBookmarks)
      })

      it(`removes the bookmark by ID from the store`, () => {
        const idToRemove = 2
        const expectedBookmarks = testBookmarks.filter(bm => bm.id != idToRemove)
        return supertest(app)
          .delete(`/api/bookmarks/${idToRemove}`)
          .set(`Authorization`, `Bearer ${process.env.API_TOKEN}`)
          .expect(204)
          .then(() =>
            supertest(app)
              .get(`/api/bookmarks`)
              .set(`Authorization`, `Bearer ${process.env.API_TOKEN}`)
              .expect(expectedBookmarks)
          )
      })
    })
  })

  // PATCH /bookmark/:id
  describe(`PATCH /api/bookmarks/:id`, () => {
    context('Given no bookmarks', () => {
      it(`responds with 404`, () => {
        const bookmarkId = 123456
        return supertest(app)
          .patch(`/api/bookmarks/${bookmarkId}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(404, { error: { message: `Bookmark not found` } })
      })
    })

    context(`Given there are bookmarks in the database`, () => {
      const testBookmark = makeBookmarksArray()

      beforeEach(`insert bookmark`, () => {
        return db
          .into(`bookmarks`)
          .insert(testBookmark)
      })

      it(`responds with 204 and updates the bookmark`, () => {
        const idToUpdate = 2
        const updateBookmark = {
          title: 'Test Updated Title',
          description: 'Test updated description',
          rating: '4'
        }
        const expectedBookmark = {
          ...testBookmark[idToUpdate - 1],
          ...updateBookmark
        }
        return supertest(app)
          .patch(`/api/bookmarks/${idToUpdate}`)
          .set(`Authorization`, `Bearer ${process.env.API_TOKEN}`)
          .send(updateBookmark)
          .expect(204)
          .then(res => {
            supertest(app)
              .get(`/api/bookmarks/${idToUpdate}`)
              .expect(expectedBookmark)
          })
      })

      it(`responds with 400 when no required fields supplied`, () => {
        const idToUpdate = 2
        return supertest(app)
          .patch(`/api/bookmarks/${idToUpdate}`)
          .set(`Authorization`, `Bearer ${process.env.API_TOKEN}`)
          .send({ irrelevantField: 'foo' })
          .expect(400, {
            error: { message: `Request body must contain either 'title', 'url', 'description' or 'rating'`}
          })
      })

      it(`responds with 204 when updating only a subset of fields`, () => {
        const idToUpdate = 2
        const updateBookmark = {
          title: 'New Updated Title'
        }
        const expectedBookmark = {
          ...testBookmark[idToUpdate - 1],
          ...updateBookmark
        }

        return supertest(app)
          .patch(`/api/bookmarks/${idToUpdate}`)
          .set(`Authorization`, `Bearer ${process.env.API_TOKEN}`)
          .send({
            ...updateBookmark,
            fieldToIgnore: `should not be in GET response`
          })
          .expect(204)
          .then(res => {
            supertest(app)
              .get(`/api/bookmarks/${idToUpdate}`)
              .expect(expectedBookmark)
          })
      })
    })
  })
})