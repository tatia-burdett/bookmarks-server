const express = require('express')
const xss = require('xss')
const logger = require('../logger')
const BookmarksService = require('./bookmarks-service')

const bookmarksRouter = express.Router()
const bodyParser = express.json()

const serializeBookmarks = bookmark => ({
  id: bookmark.id,
  title: xss(bookmark.title),
  url: bookmark.url,
  description: xss(bookmark.description),
  rating: Number(bookmark.rating)
})

bookmarksRouter // /bookmarks route
  .route('/')

  .get((req, res, next) => { // GET
    BookmarksService.getAllBookmarks(req.app.get('db'))
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
          logger.info(`Bookmark with id ${bookmark.id} created`)
          res
            .status(201)
            .location(`/api/bookmarks/${bookmark.id}`)
            .json(serializeBookmarks(bookmark))
        })
        .catch(next)
  })

bookmarksRouter // /:bookmark_id route
  .route('/:bookmark_id')

  .all((req, res, next) => {
    const { bookmark_id } = req.params
    BookmarksService.getById(
      req.app.get('db'),
      bookmark_id
    )
      .then(bookmark => {
        if (!bookmark) {
          logger.error(`Bookmark with id ${bookmark_id} not found`)
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
    const { bookmark_id } = req.params
    BookmarksService.deleteBookmark(
      req.app.get('db'),
      bookmark_id
    )
      .then(numRowsAffected => {
        logger.info(`Bookmark with id ${bookmark_id} deleted`)
        res.status(204).end()
      })
      .catch(next)
  })
  
  .patch(bodyParser, (req, res, next) => {
    const { title, url, description, rating } = req.body
    const bookmarkToUpdate = { title, url, description, rating }

    const numberOfValues = Object.values(bookmarkToUpdate).filter(Boolean).length
    if (numberOfValues === 0) {
      logger.error(`Invalid update without required fields`)
      return res.status(400).json({
        error: {
          message: `Request body must contain either 'title', 'url', 'description' or 'rating'`
        }
      })
    }

    BookmarksService.updateBookmark(
      req.app.get('db'),
      req.params.bookmark_id,
      bookmarkToUpdate
    )
      .then(numRowsAffected => {
        res.status(204).end()
      })
      .catch(next)
  })

module.exports = bookmarksRouter