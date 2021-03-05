require('dotenv').config()
const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
const helmet = require('helmet')
const { NODE_ENV } = require('./config')
const winston = require('winston')
const { v4: uuid } = require('uuid')
const bookmarkRouter = require('./bookmarks/bookmarks-router')

// logger WINSTON
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({
      filename: 'info'
    })
  ]
})
if (NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }))
}

// Sample DATA
const bookmarks = [{
  title: "Google",
  url: "www.google.com",
  description: "Popular search engine",
  rating: 3,
  id: 1
}]


const app = express()

const morganOption = (NODE_ENV === 'production')
  ? 'tiny'
  : 'common';

app.use(morgan(morganOption))
app.use(helmet())
app.use(cors())

// Authentictaion Middleware
app.use(function validateBearerToken(req, res, next) {
  const apiToken = process.env.API_TOKEN
  const authToken = req.get('Authorization')
  
  if (!authToken || authToken.split(' ')[1] != apiToken) {
    logger.error(`Unauthorized request to path: ${req.path}`)
    return res
      .status(401)
      .json({ error: 'Unauthorized Request' })
  }
  next()
})

app.get('/', (req, res) => {
  res.send('Hello, world!')
})

app.use(bookmarkRouter)

// GET endpoint
app.get('/bookmarks', (req, res) => {
  res.json(bookmarks)
})

// Get individual
app.get('/bookmarks/:id', (req, res) => {
  const { id } = req.params
  const bookmark = bookmarks.find(b => b.id == id)

  if (!bookmark) {
    logger.error(`Bookmark with id ${id} not found`)
    return res
      .status(404)
      .send('Bookmark not found')
  }
  res.json(bookmark)
})

// POST endpoint
app.post('/bookmarks', (req, res) => {
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

// DELETE endpoint
app.delete('/bookmarks/:id', (req, res) => {
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

app.use(function errorHandler(error, req, res, next) {
  let response
  if (NODE_ENV === 'production') {
    response = { error: { message: 'server error' } }
  } else {
    console.error(error)
    response = { message: error.message, error }
  }
  res.status(500).json(response)
})

module.exports = app