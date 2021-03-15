const express = require('express')
const xss = require('xss')

const bookmarkRouter = express.Router()
const bodyParser = express.json()
const BookmarksService = require('./bookmarks-service')

const serializeBookmarks = bookmark => ({
  id: bookmark.id,
  title: xss(bookmark.title),
  url: bookmark.url,
  description: xss(bookmark.description),
  rating: bookmark.rating
})

bookmarkRouter // /bookmarks route
  .route('/bookmarks')
  .get((req, res, next) => { // GET
    BookmarksService.getBookmarks(req.app.get('db'))
      .then(bookmarks => {
        res.json(bookmarks.map(serializeBookmarks))
      })
      .catch(next)
  })
  .post(bodyParser, (req, res, next) => { // POST
    const { title, url, description = '', rating } = req.body
    const newBookmark = { title, url, description, rating }

    for (const [key, value] of Object.entries(newBookmark))
      if (value == null)
        return res.status(400).json({
          error: { message: `Missing '${key}' in request body` }
        })
      
      BookmarksService.insertBookmark(
        req.app.get('db'),
        newBookmark
      )
        .then(bookmark => {
          res
            .status(201)
            .location(`/bookmarks/${bookmark.id}`)
            .json(serializeBookmarks(bookmark))
        })
        .catch(next)
  })

bookmarkRouter // /bookmarks/:id route
  .route('/bookmarks/:id')
  .all((req, res, next) => {
    BookmarksService.getById(
      req.app.get('db'),
      req.params.id
    )
      .then(bookmark => {
        if (!bookmark) {
          return res.status(404).json({
            error: { message: `Bookmark not found` }
          })
        }
        res.bookmark = bookmark
        next()
      })
      .catch(next)
  })
  .get((req, res, next) => {
    res.json(serializeBookmarks(res.bookmark))
  })
  .delete((req, res, next) => {
    BookmarksService.deleteBookmark(
      req.app.get('db'),
      req.params.id
    )
      .then(numRowsAffected => {
        res.status(203).end
      })
      .catch(next)
  })
  .patch(bodyParser, (req, res, next) => {
    const { title, description, rating } = req.body
    const bookmarkToUpdate = { title, description, rating }

    BookmarksService.updateBookmark(
      req.app.get('db'),
      req.params.id,
      bookmarkToUpdate
    )
      .then(numRowsAffected => {
        res.status(204).end()
      })
      .catch(next)
  })

module.exports = bookmarkRouter