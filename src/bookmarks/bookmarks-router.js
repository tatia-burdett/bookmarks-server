const express = require('express')
const logger = require('../logger')
const { bookmarks } = require('../store')
const { v4: uuid } = require('uuid')

const bookmarkRouter = express.Router()
const bodyParser = express.json()
const BookmarksService = require('./bookmarks-service')

bookmarkRouter // /bookmarks route
  .route('/bookmarks')
  .get((req, res, next) => { // GET
    BookmarksService.getBookmarks(req.app.get('db'))
      .then(bookmarks => {
        res.json(bookmarks)
      })
      .catch(next)
  })
  .post(bodyParser, (req, res) => { // POST
    const { title, url, description = '', rating = 0 } = req.body

    if (!title) {
      logger.error('Title is required')
      return res
        .status(400)
        .send('Invalid data')
    }
  
    if (!url) {
      logger.error('url is required')
      return res
        .status(400)
        .send('Invalid data')
    }
  
    const id = uuid()
  
    const bookmark = {
      title,
      url,
      description,
      rating,
      id
    }
  
    bookmarks.push(bookmark)
  
    logger.info(`Bookmark with the id ${id} created`)
    res
      .status(201)
      .location(`http://localhost:8000/bookmarks/${id}`)
      .json(bookmark)
  })

bookmarkRouter // /bookmarks/:id route
  .route('/bookmarks/:id')
  .get((req, res, next) => { // GET
    const { id } = req.params
    BookmarksService.getById(req.app.get('db'), id)
      .then(bookmark => {
        if(!bookmark) {
          logger.error(`Bookmark with id ${id} not found`)
          return res.status(404).json({
            error: { message: `Bookmark not found` }
          })
        }
        res.json(bookmark)
      })
      .catch(next)
  })
  .delete((req, res) => { // DELETE
    const { id } = req.params
    const bookmarkIndex = bookmarks.findIndex(b => b.id == id)
  
    if(bookmarkIndex === -1) {
      logger.error(`Bookmark with the id ${id} not found`)
      return res
        .status(404)
        .send('Bookmark not found')
    }
  
    bookmarks.splice(bookmarkIndex, 1)
  
    logger.info(`Bookmark with id ${id} deleted`)
    res
      .status(204)
      .end()
  })

module.exports = bookmarkRouter