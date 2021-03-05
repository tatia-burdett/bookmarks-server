const express = require('express')

const bookmarkRouter = express.Router()
const bodyParser = express.son()

bookmarkRouter
  .route('/bookmarks')
  .get((req, res) => {

  })
  .post(bodyParser, (req, res) => {

  })

bookmarkRouter
  .route('/bookmarks/:id')
  .get((req, res) => {

  })
  .delete((req, res) => {

  })

module.exports = bookmarkRouter